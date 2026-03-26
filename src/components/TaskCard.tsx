'use client';

import type { Task } from '@/lib/types';
import { ExternalLink, GithubIcon } from 'lucide-react';

export function TaskCard({ task }: { task: Task }) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      {/* Task name */}
      <h3 className="font-semibold text-base">{task.name}</h3>
      
      {/* PROJECT INFO - NEW */}
      {task.project && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: task.project.color }}
          />
          <span className="truncate">{task.project.name}</span>
        </div>
      )}
      
      {/* Branch name */}
      {task.branch_name && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <GithubIcon className="w-3 h-3" />
          <span className="truncate">🌿 {task.branch_name}</span>
        </div>
      )}
      
      {/* PR URL */}
      {task.pr_url && (
        <a
          href={task.pr_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          <span className="truncate">PR #{task.pr_number}</span>
        </a>
      )}
      
      {/* Vercel Preview URL */}
      {task.vercel_preview_url && (
        <a
          href={task.vercel_preview_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          <span className="truncate">Preview</span>
        </a>
      )}
      
      {/* Status badge */}
      <div className="text-sm">
        <span
          className={`font-medium px-2 py-1 rounded ${
            task.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : task.status === 'cancelled'
              ? 'bg-red-100 text-red-800'
              : task.status === 'merged'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
        </span>
      </div>
    </div>
  );
}