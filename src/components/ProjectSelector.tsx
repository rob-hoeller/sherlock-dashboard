'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Assuming the correct import path is select-client or similar
import type { Project } from '@/lib/types';

type ProjectSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function ProjectSelector({ value, onChange, required = false }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects?active=true')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load projects:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading projects...</div>;
  }

  const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Project {required && <span className="text-destructive">*</span>}
      </label>
      <Select value={value} onValueChange={onChange} required={required}>
        <SelectTrigger>
          <SelectValue placeholder="Select project..." />
        </SelectTrigger>
        <SelectContent>
          {sortedProjects.map(project => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span>{project.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}