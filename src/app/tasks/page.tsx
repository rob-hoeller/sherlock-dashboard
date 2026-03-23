'use client';

import { useEffect, useState } from 'react';
import { TaskStatus, TaskType, TaskDocument, TaskHistory, TaskDetail } from '@/types/tasks';
import { supabaseAdmin } from '@/lib/supabase';
import { Download, GithubIcon, ExternalLink, X, Search } from 'lucide-react';
import Link from 'next/link';

interface Task {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  task_type: TaskType;
  branch_name: string | null;
  pr_url: string | null;
  pr_number: number | null;
  vercel_preview_url: string | null;
  vercel_deployment_id: string | null;
  github_repo: string;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  documents: TaskDocument[];
  history: TaskHistory[];
}

const TaskCard = ({ task }: { task: Task }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4 relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        {isExpanded ? <X /> : <Search />}
      </button>
      <h3 className="text-lg font-semibold mb-2">{task.name}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-2">
        Status: {task.status} | Type: {task.task_type}
      </p>
      {isExpanded && (
        <>
          {task.pr_url && (
            <div className="mb-2">
              <Link
                href={task.pr_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 dark:text-blue-400 flex items-center space-x-1"
              >
                <GithubIcon size={16} />
                <span>PR #{task.pr_number}</span>
              </Link>
            </div>
          )}
          {task.vercel_preview_url ? (
            <div className="mb-2">
              <Link
                href={task.vercel_preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 dark:text-blue-400 flex items-center space-x-1"
              >
                <ExternalLink size={16} />
                <span>Vercel Preview</span>
              </Link>
            </div>
          ) : task.branch_name ? (
            <button
              onClick={() => {
                // Fetch Vercel preview URL logic here
                fetch(`/api/tasks/${task.id}/vercel`, { method: 'POST' })
                  .then((response) => response.json())
                  .then((data) => {
                    if (data.vercel_preview_url) {
                      // Update the task with the new vercel_preview_url
                      const updatedTask = { ...task, vercel_preview_url: data.vercel_preview_url };
                      setIsExpanded(false);
                      setIsExpanded(true); // Re-render to show the new URL
                    }
                  })
                  .catch((error) => console.error('Error fetching Vercel preview:', error));
              }}
              className="text-blue-500 dark:text-blue-400 flex items-center space-x-1"
            >
              <ExternalLink size={16} />
              <span>Fetch Preview</span>
            </button>
          ) : null}
        </>
      )}
    </div>
  );
};

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabaseAdmin.from('tasks').select('*');
      if (error) {
        console.error('Error fetching tasks:', error);
      } else {
        setTasks(data as Task[]);
      }
    };

    fetchTasks();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Task Kanban Board</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};

export default TasksPage;