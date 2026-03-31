"use client";

import { useState, useEffect } from "react";
import { X, Check, Plus, Eye, EyeOff, ChevronRight, ChevronLeft } from "lucide-react";

const PRESET_COLORS = [
  { name: "Blue", hex: "#3B82F6" },
  { name: "Red", hex: "#EF4444" },
  { name: "Green", hex: "#22C55E" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Orange", hex: "#F97316" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Slate", hex: "#64748B" },
];

const STEPS = [
  { id: "basics", label: "Basics" },
  { id: "credentials", label: "Credentials" },
  { id: "setup", label: "Setup" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface ProjectWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function ProjectWizard({ open, onClose, onCreated }: ProjectWizardProps) {
  const [step, setStep] = useState<StepId>("basics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Basics
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [projectType, setProjectType] = useState<"existing" | "template">("existing");

  // Credentials
  const [credentials, setCredentials] = useState<{ key: string; value: string }[]>([]);
  const [showValues, setShowValues] = useState<Record<number, boolean>>({});

  // Created project ID (set after step 1 save)
  const [projectId, setProjectId] = useState<string | null>(null);

  // Setup status
  const [setupStatus, setSetupStatus] = useState<"pending" | "running" | "success" | "error">("pending");
  const [setupMessage, setSetupMessage] = useState("");

  // Review — detected settings (editable)
  const [detectedSettings, setDetectedSettings] = useState<{
    locked_files: string[];
    pre_read_files: string[];
    project_instructions: string[];
    build_warning?: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset all state when closed
      setStep("basics");
      setName("");
      setDescription("");
      setGithubRepoUrl("");
      setColor("#3B82F6");
      setProjectType("existing");
      setCredentials([]);
      setShowValues({});
      setProjectId(null);
      setSetupStatus("pending");
      setSetupMessage("");
      setDetectedSettings(null);
      setError("");
    }
  }, [open]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  const canProceed = (): boolean => {
    switch (step) {
      case "basics":
        return !!name.trim() && !!githubRepoUrl.trim();
      case "credentials":
        return true; // credentials are optional
      case "setup":
        return setupStatus === "success";
      case "review":
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    setError("");

    if (step === "basics") {
      // Save the project to the database
      setLoading(true);
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            github_repo_url: githubRepoUrl.trim() || null,
            color: color.trim() || null,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create project");
        }

        const project = await res.json();
        setProjectId(project.id);
        setStep("credentials");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === "credentials") {
      // Save credentials if any
      const newCreds = credentials.filter((c) => c.key.trim() && c.value.trim());
      if (newCreds.length > 0 && projectId) {
        setLoading(true);
        try {
          const res = await fetch(`/api/projects/${projectId}/credentials`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCreds),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to save credentials");
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setLoading(false);
          return;
        } finally {
          setLoading(false);
        }
      }
      setStep("setup");
      return;
    }

    if (step === "setup") {
      setStep("review");
      return;
    }

    if (step === "review") {
      // Finalize — save detected settings to project, then close
      if (projectId && detectedSettings) {
        setLoading(true);
        try {
          await fetch(`/api/projects/${projectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              settings: {
                locked_files: detectedSettings.locked_files,
                pre_read_files: detectedSettings.pre_read_files || [],
                project_instructions: detectedSettings.project_instructions,
              },
            }),
          });
        } catch {
          // Non-fatal — settings can be updated later
        } finally {
          setLoading(false);
        }
      }
      onCreated();
      onClose();
      return;
    }
  };

  const handleBack = () => {
    const idx = currentStepIndex;
    if (idx > 0) {
      // Don't allow going back to basics after project is created
      if (STEPS[idx - 1].id === "basics" && projectId) return;
      setStep(STEPS[idx - 1].id);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const triggerSetup = async () => {
    if (!projectId) return;
    setSetupStatus("running");
    setSetupMessage("Requesting sandbox setup...");

    try {
      const res = await fetch(`/api/projects/${projectId}/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_type: projectType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Setup request failed");
      }

      // Poll for completion
      setSetupMessage("Setting up sandbox environment...");
      pollSetupStatus();
    } catch (err: unknown) {
      setSetupStatus("error");
      setSetupMessage(err instanceof Error ? err.message : "Setup failed");
    }
  };

  const pollSetupStatus = async () => {
    if (!projectId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/setup`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "completed") {
          setSetupStatus("success");
          setSetupMessage("Sandbox setup complete!");
          if (data.detected_settings) {
            setDetectedSettings(data.detected_settings);
          }
          return;
        }

        if (data.status === "failed") {
          setSetupStatus("error");
          setSetupMessage(data.error || "Setup failed");
          return;
        }

        // Still running — poll again
        setTimeout(poll, 3000);
      } catch {
        // Network error — retry
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  const addCredential = () => {
    setCredentials([...credentials, { key: "", value: "" }]);
  };

  const removeCredential = (index: number) => {
    setCredentials(credentials.filter((_, i) => i !== index));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">New Project</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center px-6 py-3 border-b border-zinc-200 dark:border-zinc-700 gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  s.id === step
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : i < currentStepIndex
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                }`}
              >
                {i < currentStepIndex ? (
                  <Check size={12} />
                ) : (
                  <span className="w-4 text-center">{i + 1}</span>
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} className="mx-1 text-zinc-300 dark:text-zinc-600" />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 min-h-[300px]">
          {/* Step: Basics */}
          {step === "basics" && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Project description..."
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  GitHub Repo URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Project Type
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setProjectType("existing")}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      projectType === "existing"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                    }`}
                  >
                    <div className="font-semibold">Existing Repo</div>
                    <div className="text-xs mt-1 opacity-70">Clone and configure an existing codebase</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectType("template")}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      projectType === "template"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                    }`}
                  >
                    <div className="font-semibold">New from Template</div>
                    <div className="text-xs mt-1 opacity-70">Scaffold from the HBX project template</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setColor(preset.hex)}
                      title={preset.name}
                      className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${
                        color === preset.hex
                          ? "border-zinc-900 dark:border-white scale-110"
                          : "border-transparent hover:border-zinc-400 dark:hover:border-zinc-500"
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    >
                      {color === preset.hex && (
                        <Check size={14} className="text-white drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step: Credentials */}
          {step === "credentials" && (
            <>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Add environment variables for this project. These are stored securely in the vault and used for Vercel deployments, API keys, and other secrets.
              </p>
              {credentials.map((cred, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cred.key}
                    onChange={(e) =>
                      setCredentials(credentials.map((c, i) => (i === index ? { ...c, key: e.target.value } : c)))
                    }
                    placeholder="Key (e.g. VERCEL_PROJECT_ID)"
                    className="flex-1 min-w-0 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                  <div className="flex-1 min-w-0 relative">
                    <input
                      type={showValues[index] ? "text" : "password"}
                      value={cred.value}
                      onChange={(e) =>
                        setCredentials(credentials.map((c, i) => (i === index ? { ...c, value: e.target.value } : c)))
                      }
                      placeholder="Value"
                      className="w-full px-3 py-2 pr-10 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowValues({ ...showValues, [index]: !showValues[index] })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {showValues[index] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCredential(index)}
                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCredential}
                className="flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <Plus size={16} className="mr-1" />
                Add Variable
              </button>
              {credentials.length === 0 && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                  No credentials added yet. You can add them later from the project settings.
                </p>
              )}
            </>
          )}

          {/* Step: Setup */}
          {step === "setup" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              {setupStatus === "pending" && (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      Sandbox Setup
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
                      {projectType === "template"
                        ? "This will scaffold a new project from the HBX template, clone it into the sandbox, install dependencies, and configure the build environment."
                        : "This will clone the repository into the sandbox, install dependencies, and analyze the project to generate build configuration."}
                    </p>
                  </div>
                  <button
                    onClick={triggerSetup}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Start Setup
                  </button>
                </>
              )}

              {setupStatus === "running" && (
                <div className="text-center">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{setupMessage}</p>
                </div>
              )}

              {setupStatus === "success" && (
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={24} className="text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Setup Complete
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{setupMessage}</p>
                </div>
              )}

              {setupStatus === "error" && (
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X size={24} className="text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Setup Failed
                  </h3>
                  <p className="text-sm text-red-500 dark:text-red-400 mb-4">{setupMessage}</p>
                  <button
                    onClick={() => { setSetupStatus("pending"); setSetupMessage(""); }}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step: Review */}
          {step === "review" && (
            <>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  Review Project Settings
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Confirm the detected configuration before finalizing.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                  <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Project</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-zinc-500">Name:</span>{" "}
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium">{name}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Type:</span>{" "}
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                        {projectType === "template" ? "From Template" : "Existing Repo"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-zinc-500">Repo:</span>{" "}
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium font-mono text-xs">{githubRepoUrl}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                  <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Credentials ({credentials.filter((c) => c.key.trim()).length})
                  </h4>
                  {credentials.filter((c) => c.key.trim()).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {credentials.filter((c) => c.key.trim()).map((c, i) => (
                        <span key={i} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-700 dark:text-zinc-300">
                          {c.key}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">None configured</p>
                  )}
                </div>

                {detectedSettings && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Coder Settings
                    </h4>

                    {/* Locked Files — editable */}
                    <div>
                      <p className="text-xs text-zinc-500 mb-1.5">Locked Files (coder will not modify these)</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {detectedSettings.locked_files.map((f, i) => (
                          <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs font-mono text-amber-700 dark:text-amber-300">
                            {f}
                            <button
                              type="button"
                              onClick={() => setDetectedSettings({
                                ...detectedSettings,
                                locked_files: detectedSettings.locked_files.filter((_, idx) => idx !== i),
                              })}
                              className="ml-0.5 text-amber-500 hover:text-amber-700"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add locked file path..."
                          className="flex-1 px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                              const val = (e.target as HTMLInputElement).value.trim();
                              setDetectedSettings({
                                ...detectedSettings,
                                locked_files: [...detectedSettings.locked_files, val],
                              });
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Pre-read Files */}
                    {detectedSettings.pre_read_files && detectedSettings.pre_read_files.length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1.5">Pre-read Files (coder reads these before generating)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {detectedSettings.pre_read_files.map((f, i) => (
                            <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs font-mono text-blue-700 dark:text-blue-300">
                              {f}
                              <button
                                type="button"
                                onClick={() => setDetectedSettings({
                                  ...detectedSettings,
                                  pre_read_files: detectedSettings.pre_read_files.filter((_, idx) => idx !== i),
                                })}
                                className="ml-0.5 text-blue-500 hover:text-blue-700"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Project Instructions — editable */}
                    <div>
                      <p className="text-xs text-zinc-500 mb-1.5">Project-Specific Instructions</p>
                      {detectedSettings.project_instructions.length > 0 ? (
                        <ul className="space-y-1.5 mb-2">
                          {detectedSettings.project_instructions.map((inst, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                              <span className="flex-1">• {inst}</span>
                              <button
                                type="button"
                                onClick={() => setDetectedSettings({
                                  ...detectedSettings,
                                  project_instructions: detectedSettings.project_instructions.filter((_, idx) => idx !== i),
                                })}
                                className="mt-0.5 text-zinc-400 hover:text-red-500 shrink-0"
                              >
                                <X size={10} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-zinc-400 italic mb-2">None detected. Add project-specific rules below.</p>
                      )}
                      <input
                        type="text"
                        placeholder="Add a project-specific instruction..."
                        className="w-full px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                            const val = (e.target as HTMLInputElement).value.trim();
                            setDetectedSettings({
                              ...detectedSettings,
                              project_instructions: [...detectedSettings.project_instructions, val],
                            });
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                      />
                    </div>

                    {/* Build Warning */}
                    {detectedSettings.build_warning && (
                      <div className="rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Build Warning</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">{detectedSettings.build_warning}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    ✓ Sandbox configured and ready to accept tasks
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <div>
            {currentStepIndex > 0 && !(currentStepIndex === 1 && projectId) && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleNext}
              disabled={loading || !canProceed()}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                "Saving..."
              ) : step === "review" ? (
                "Finish"
              ) : (
                <>
                  Next
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
