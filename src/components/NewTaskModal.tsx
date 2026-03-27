"use client";

import { useState, useRef, useEffect } from "react";
import { X, Paperclip, Plus } from "lucide-react";

interface NewTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface AttachedFile {
  name: string;
  content: string;
  doc_type: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

export default function NewTaskModal({ open, onClose, onCreated }: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<"feature" | "bugfix">("feature");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/projects?active=true")
        .then((res) => res.json())
        .then((data: Project[]) => {
          setProjects(data);
          if (data.length === 1) {
            setSelectedProject(data[0]);
          }
        })
        .catch((err) => console.error("Failed to fetch projects", err));
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    Array.from(selected).forEach((file) => {
      const reader = new FileReader();

      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        reader.onloadend = () => {
          setFiles((prev) => [
            ...prev,
            {
              name: file.name,
              content: reader.result as string,
              doc_type: file.type.startsWith("image/") ? "screenshot" : "reference",
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onloadend = () => {
          setFiles((prev) => [
            ...prev,
            { name: file.name, content: reader.result as string, doc_type: "planning" },
          ]);
        };
        reader.readAsText(file);
      }
    });

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!selectedProject) {
      setError("Project is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tasks/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "plan",
          payload: {
            name: title.trim(),
            description: description.trim() || null,
            task_type: taskType,
            files: files.length > 0 ? files : undefined,
            project_id: selectedProject.id,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create task");
      }

      // Reset and close
      setTitle("");
      setDescription("");
      setTaskType("feature");
      setFiles([]);
      setError("");
      setSelectedProject(null);
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setTaskType("feature");
    setFiles([]);
    setError("");
    setSelectedProject(null);
    onClose();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setIsOpen(false);
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">New Task</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Project */}
          <div ref={projectDropdownRef} className="relative">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Project <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => setIsOpen(!isOpen)}
              className={`w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 flex items-center justify-between cursor-pointer ${
                isOpen ? "rounded-b-none" : ""
              }`}
            >
              {selectedProject ? (
                <div className="flex items-center gap-2">
                  <span
                    className="block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedProject.color || "#3B82F6" }}
                  />
                  <span className="truncate">{selectedProject.name}</span>
                </div>
              ) : (
                <span className="text-zinc-400">Select a project</span>
              )}
              <svg className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {isOpen && (
              <div className="absolute left-0 right-0 z-10 border border-t-0 border-zinc-300 dark:border-zinc-600 rounded-b-lg bg-white dark:bg-zinc-800 shadow-lg">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search projects..."
                  className="w-full px-3 py-2 border-b border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredProjects.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-zinc-400">No projects found</div>
                  ) : (
                    filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => handleSelectProject(project)}
                        className={`px-3 py-2 flex items-center gap-2 cursor-pointer text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
                          selectedProject?.id === project.id ? "bg-amber-50 dark:bg-amber-900/20" : ""
                        }`}
                      >
                        <span
                          className="block w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: project.color || "#3B82F6" }}
                        />
                        {project.name}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Add details, requirements, or context..."
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={taskType === "feature"}
                  onChange={() => setTaskType("feature")}
                  className="accent-amber-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Feature Request</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={taskType === "bugfix"}
                  onChange={() => setTaskType("bugfix")}
                  className="accent-amber-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Bug Fix</span>
              </label>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Attachments
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-6 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <Paperclip className="mx-auto mb-2 text-zinc-400" size={24} />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Click to browse files
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Images, markdown, text, PDF
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.md,.txt,.pdf,text/markdown,text/plain,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Attached files list */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 truncate">
                      <Paperclip size={14} className="shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 text-zinc-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
            {loading ? "Submitting..." : "Submit Task"}
          </button>
        </div>
      </div>
    </div>
  );
}