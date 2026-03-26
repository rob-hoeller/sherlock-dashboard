'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProjectSelector } from './ProjectSelector';

type TaskFormProps = {
  onSubmit: (task: any) => void;
};

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState('feature');
  const [projectId, setProjectId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!projectId) {
      setError('Please select a project');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name: name.trim(),
          description: description.trim() || null,
          task_type: taskType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create task');
      }

      const task = await response.json();
      onSubmit(task);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Project Selector */}
      <ProjectSelector
        value={projectId}
        onChange={setProjectId}
        required
      />

      {/* Task Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Task Name <span className="text-destructive">*</span>
        </label>
        <Input
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="Task name"
          required
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="Task description"
          maxLength={500}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {description.length} / 500 characters
        </p>
      </div>

      {/* Task Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Task Type</label>
        <select
          value={taskType}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTaskType(e.target.value)}
          className="w-full p-2 border rounded-lg"
        >
          <option value="feature">Feature</option>
          <option value="bug">Bug</option>
          <option value="chore">Chore</option>
          {/* Add more task types as needed */}
        </select>
      </div>

      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Task'}
      </Button>
    </form>
  );
}