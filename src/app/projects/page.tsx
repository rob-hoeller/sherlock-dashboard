'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectForm } from '@/components/ProjectForm';
import type { ProjectWithCounts } from '@/lib/types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActive, setShowActive] = useState(true);
  
  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithCounts | null>(null);
  
  // Deactivation dialog state
  const [deactivateDialog, setDeactivateDialog] = useState<{
    open: boolean;
    project: ProjectWithCounts | null;
    incompleteCount: number;
  }>({
    open: false,
    project: null,
    incompleteCount: 0,
  });

  const loadProjects = async () => {
    setLoading(true);
    try {
      const url = `/api/projects?active=${showActive}`;
      const response = await fetch(url);
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [showActive]);

  const handleEdit = (project: ProjectWithCounts) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDeactivate = async (project: ProjectWithCounts) => {
    // First try to deactivate (will fail if incomplete tasks exist)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.status === 400 && data.error === 'incomplete_tasks') {
        // Show confirmation dialog
        setDeactivateDialog({
          open: true,
          project,
          incompleteCount: data.count,
        });
      } else if (response.ok) {
        // Successfully deactivated (no incomplete tasks)
        loadProjects();
      } else {
        throw new Error(data.error || 'Failed to deactivate project');
      }
    } catch (err) {
      console.error('Failed to deactivate project:', err);
      alert((err as Error).message);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateDialog.project) return;

    try {
      const response = await fetch(
        `/api/projects/${deactivateDialog.project.id}?confirmed=true`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deactivate project');
      }

      const result = await response.json();
      alert(`Project deactivated. ${result.cancelled_count} tasks cancelled.`);
      
      setDeactivateDialog({ open: false, project: null, incompleteCount: 0 });
      loadProjects();
    } catch (err) {
      console.error('Failed to deactivate project:', err);
      alert((err as Error).message);
    }
  };

  const handleActivate = async (project: ProjectWithCounts) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to activate project');
      }

      loadProjects();
    } catch (err) {
      console.error('Failed to activate project:', err);
      alert((err as Error).message);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button onClick={() => setFormOpen(true)}>
          New Project
        </Button>
      </div>

      {/* Filter toggle */}
      <div className="flex gap-2">
        <Button
          variant={showActive ? 'default' : 'outline'}
          onClick={() => setShowActive(true)}
        >
          Active
        </Button>
        <Button
          variant={!showActive ? 'default' : 'outline'}
          onClick={() => setShowActive(false)}
        >
          Inactive
        </Button>
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="text-center text-muted-foreground">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">No projects yet</p>
          <Button onClick={() => setFormOpen(true)}>
            Create your first project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEdit}
              onDeactivate={handleDeactivate}
              onActivate={handleActivate}
            />
          ))}
        </div>
      )}

      {/* Project form dialog */}
      <ProjectForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProject(null);
        }}
        onSuccess={loadProjects}
        project={editingProject}
      />

      {/* Deactivate confirmation dialog */}
      <AlertDialog
        open={deactivateDialog.open}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDeactivateDialog({ open: false, project: null, incompleteCount: 0 });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This project has <strong>{deactivateDialog.incompleteCount}</strong> incomplete
              tasks. Deactivating will cancel all of them. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} className="bg-destructive">
              Deactivate & Cancel {deactivateDialog.incompleteCount} Tasks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}