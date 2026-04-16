"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface Project {
  id: string;
  name: string;
  color: string;
}

interface EpicCreateModalProps {
  onClose: () => void;
  onCreate: (epicId: string) => void;
}

export default function EpicCreateModal({ onClose, onCreate }: EpicCreateModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/projects?active=true")
      .then((r) => r.json())
      .then((data: Project[]) => {
        setProjects(data);
        if (data.length === 1) setSelectedProject(data[0]);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedProject || !name) return;
    setSubmitting(true);

    const res = await fetch("/api/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: selectedProject.id, name, description }),
    });

    if (res.ok) {
      const epic = await res.json();

      // Auto-fire first PM message to kick off the conversation
      await fetch(`/api/epics/${epic.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: description || `I want to build: ${name}. What do you need to know to break this down into tasks?`,
        }),
      });

      onCreate(epic.id);
    } else {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">New Epic</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={18} className="text-zinc-500" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Project selector — matches NewTaskModal style */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Project <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => setIsOpen(!isOpen)}
              className={`w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-between cursor-pointer ${
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
              <svg
                className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {isOpen && (
              <div className="absolute left-0 right-0 z-10 border border-t-0 border-zinc-300 dark:border-zinc-600 rounded-b-lg bg-white dark:bg-zinc-800 shadow-lg">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full px-3 py-2 border-b border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredProjects.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-zinc-400">No projects found</div>
                  ) : (
                    filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => {
                          setSelectedProject(project);
                          setIsOpen(false);
                          setSearchTerm("");
                        }}
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

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Epic Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., User Authentication System"
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
              <span className="font-normal text-zinc-400 ml-1">(describe the full feature you want)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe the feature in detail. The PM agent will read this and ask clarifying questions before proposing a task breakdown..."
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedProject || !name || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {submitting ? "Creating..." : "Create & Start Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
