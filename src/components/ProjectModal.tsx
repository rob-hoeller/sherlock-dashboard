"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { Project } from "@/types/projects";

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

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  project?: Project | null;
}

export default function ProjectModal({ open, onClose, onSaved, project }: ProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [color, setColor] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setGithubRepoUrl(project.github_repo_url || "");
      setColor(project.color || "");
      setIsActive(project.is_active);
    } else {
      setName("");
      setDescription("");
      setGithubRepoUrl("");
      setColor("");
      setIsActive(true);
    }
  }, [project]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const url = project ? `/api/projects/${project.id}` : "/api/projects";
      const method = project ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        github_repo_url: githubRepoUrl.trim() || null,
        color: color.trim() || null,
      };

      if (project) {
        body.is_active = isActive;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save project");
      }

      setName("");
      setDescription("");
      setGithubRepoUrl("");
      setColor("");
      setIsActive(true);
      setError("");
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setGithubRepoUrl("");
    setColor("");
    setIsActive(true);
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {project ? "Edit Project" : "New Project"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Project description..."
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* GitHub Repo URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              GitHub Repo URL
            </label>
            <input
              type="text"
              value={githubRepoUrl}
              onChange={(e) => setGithubRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Color */}
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

          {/* Active Toggle (edit mode only) */}
          {project && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                  isActive ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : project ? "Save Changes" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
