"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Pencil, Plus, GithubIcon } from "lucide-react";
import { Project } from "@/types/projects";
import ProjectModal from "@/components/ProjectModal";
import ProjectWizard from "@/components/ProjectWizard";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [hideInactive, setHideInactive] = useState(true);

  const fetchProjects = useCallback(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch((error) => console.error("Error fetching projects:", error));
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openCreateWizard = () => {
    setIsWizardOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProject(undefined);
  };

  const handleSaved = () => {
    fetchProjects();
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const sortedProjects = hideInactive
    ? filteredProjects.filter((p) => p.is_active)
    : [
        ...filteredProjects.filter((p) => p.is_active),
        ...filteredProjects.filter((p) => !p.is_active),
      ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Projects</h1>
        <button
          onClick={openCreateWizard}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
        />
      </div>

      {/* Hide Inactive Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          role="switch"
          aria-checked={hideInactive}
          onClick={() => setHideInactive(!hideInactive)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
            hideInactive ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-600"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              hideInactive ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Hide inactive projects
        </span>
      </div>

      {/* Grid */}
      {sortedProjects.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          {searchTerm ? "No projects match your search." : "No projects yet. Create one to get started."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProjects.map((project) => (
            <div
              key={project.id}
              className={`relative overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow ${
                !project.is_active ? "opacity-60" : ""
              }`}
            >
              {/* Color accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: project.color || "#3B82F6" }}
              />

              <div className="p-4 pl-5">
                {/* Top row: name + edit */}
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate flex-1">
                    {project.name}
                  </h3>
                  <button
                    onClick={() => openEditModal(project)}
                    className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 shrink-0"
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
                  {project.description || "No description"}
                </p>

                {/* Bottom row: GitHub link + status badge */}
                <div className="flex items-center justify-between">
                  {project.github_repo_url ? (
                    <a
                      href={project.github_repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-400 hover:underline"
                    >
                      <GithubIcon size={14} />
                      <span>Repository</span>
                    </a>
                  ) : (
                    <span />
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      project.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                    }`}
                  >
                    {project.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal (existing projects) */}
      <ProjectModal
        open={isModalOpen}
        onClose={closeModal}
        onSaved={handleSaved}
        project={editingProject}
      />

      {/* Create Wizard (new projects) */}
      <ProjectWizard
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={handleSaved}
      />
    </div>
  );
}