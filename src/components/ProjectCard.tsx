import Link from 'next/link';
import { ExternalLink, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { ProjectWithCounts } from '@/lib/types';

type ProjectCardProps = {
  project: ProjectWithCounts;
  onEdit: (project: ProjectWithCounts) => void;
  onDeactivate: (project: ProjectWithCounts) => void;
  onActivate: (project: ProjectWithCounts) => void;
};

export function ProjectCard({ project, onEdit, onDeactivate, onActivate }: ProjectCardProps) {
  return (
    <div
      className="border rounded-lg p-4 space-y-3"
      style={{ borderLeftWidth: '3px', borderLeftColor: project.color }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{project.name}</h3>
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {project.description}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(project)}>
              Edit
            </DropdownMenuItem>
            {project.is_active ? (
              <DropdownMenuItem
                onClick={() => onDeactivate(project)}
                className="text-destructive"
              >
                Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onActivate(project)}>
                Activate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* GitHub repo link */}
      {project.github_repo_url && (
        <a
          href={project.github_repo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          <span className="truncate">{project.github_repo_url}</span>
        </a>
      )}

      {/* Task counts and status */}
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          {project.task_count} tasks
        </Badge>
        {project.active_task_count > 0 && (
          <Badge variant="secondary">
            {project.active_task_count} active
          </Badge>
        )}
        <Badge variant={project.is_active ? 'default' : 'secondary'}>
          {project.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
    </div>
  );
}