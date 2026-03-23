"use client";

import { useEffect, useState } from "react";
import { Task, TaskStatus, TaskDetail } from "@/types/tasks";
import { Search, GithubIcon, ExternalLink, X } from "lucide-react";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { supabaseClient } from "@/lib/supabase";

const STATUS_COLORS: Record<TaskStatus, string> = {
  planning: "border-gray-400 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
  needs_review: "border-amber-400 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200",
  approved: "border-blue-400 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200",
  in_process: "border-indigo-400 bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200",
  blocked: "border-red-400 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200",
  preview: "border-purple-400 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200",
  completed: "border-green-400 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200",
  cancelled: "border-neutral-400 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  planning: "Planning",
  needs_review: "Needs Review",
  approved: "Approved",
  in_process: "In Process",
  blocked: "Blocked",
  preview: "Preview",
  completed: "Completed",
  cancelled: "Cancelled",
};

const COLUMN_ORDER: TaskStatus[] = [
  "planning",
  "needs_review",
  "approved",
  "in_process",
  "blocked",
  "preview",
  "completed",
];

function timeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function TaskCard({ task, onClick }: { task: Task; onClick: (id: string) => void }) {
  return (
    <div
      className="mb-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-150 cursor-pointer"
      onClick={() => onClick(task.id)}
    >
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
          {task.name}
        </h3>
        <span
          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
            task.task_type === "feature"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
          }`}
        >
          {task.task_type}
        </span>
      </div>

      {task.branch_name && (
        <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
          {task.branch_name}
        </p>
      )}

      <div className="mt-2 flex items-center gap-3">
        {task.pr_url && (
          <a
            href={task.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
          >
            <GithubIcon size={12} /> PR
          </a>
        )}
        {task.vercel_preview_url && (
          <a
            href={task.vercel_preview_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ExternalLink size={12} /> Preview
          </a>
        )}
        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
          {timeSince(new Date(task.updated_at))} ago
        </span>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [completedDays, setCompletedDays] = useState(7);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      try {
        const [allRes, completedRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch(`/api/tasks?status=completed&completedDays=${completedDays}`),
        ]);
        const allData: Task[] = await allRes.json();
        const completedData: Task[] = await completedRes.json();

        // Merge: non-completed from all + completed from filtered query
        const nonCompleted = allData.filter((t) => t.status !== "completed");
        setTasks([...nonCompleted, ...completedData]);
      } catch {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [completedDays]);

  useEffect(() => {
    const channel = supabaseClient
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [payload.new as Task, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === (payload.new as Task).id ? payload.new as Task : t));
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  // Client-side search filter
  const filtered = searchTerm
    ? tasks.filter(
        (t) =>
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.description || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : tasks;

  // Group by status
  const grouped: Record<TaskStatus, Task[]> = {} as Record<TaskStatus, Task[]>;
  for (const s of [...COLUMN_ORDER, "cancelled" as TaskStatus]) {
    grouped[s] = [];
  }
  for (const task of filtered) {
    if (grouped[task.status]) {
      grouped[task.status].push(task);
    }
  }

  const columns: TaskStatus[] = showCancelled
    ? [...COLUMN_ORDER, "cancelled"]
    : COLUMN_ORDER;

  const handleShowMore = () => {
    setCompletedDays((prev) => (prev === 7 ? 30 : prev === 30 ? 90 : 9999));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <button
            onClick={() => setShowCancelled(!showCancelled)}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {showCancelled ? "Hide Cancelled" : "Show Cancelled"}
          </button>
        </div>
      </div>

      {/* Board */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No tasks yet. Create one via Telegram.
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full min-w-max">
            {columns.map((status) => {
              const columnTasks = grouped[status];
              return (
                <div
                  key={status}
                  className="flex flex-col w-[280px] shrink-0 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  {/* Column header */}
                  <div
                    className={`px-3 py-2 rounded-t-lg border-b-2 ${STATUS_COLORS[status]} text-sm font-semibold flex justify-between items-center`}
                  >
                    <span>{STATUS_LABELS[status]}</span>
                    <span className="text-xs font-normal opacity-70">
                      ({columnTasks.length})
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 min-h-0" style={{ maxHeight: "calc(100vh - 220px)" }}>
                    {columnTasks.length === 0 ? (
                      <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">
                        No tasks
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={setSelectedTaskId} />
                      ))
                    )}
                  </div>

                  {/* Completed show more */}
                  {status === "completed" && completedDays < 9999 && (
                    <button
                      onClick={handleShowMore}
                      className="px-3 py-2 text-xs text-center border-t border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-lg"
                    >
                      {completedDays === 7
                        ? "Show 30 days"
                        : completedDays === 30
                        ? "Show 90 days"
                        : "Show all"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Detail Panel */}
      <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}