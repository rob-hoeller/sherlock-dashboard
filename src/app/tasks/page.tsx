"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { Task, TaskStatus, TaskDetail } from "@/types/tasks";
import { Search, GithubIcon, ExternalLink, X, Clock, Plus, ChevronDown, ChevronRight } from "lucide-react";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import RecentActivityPanel from "@/components/RecentActivityPanel";
import NewTaskModal from "@/components/NewTaskModal";
import { supabaseClient } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";

const STATUS_COLORS: Record<TaskStatus, string> = {
  planning: "border-gray-400 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
  needs_review: "border-amber-400 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200",
  approved: "border-blue-400 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200",
  on_deck: "border-orange-400 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200",
  in_process: "border-indigo-400 bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200",
  commit_ready: "border-teal-400 bg-teal-100 dark:bg-teal-800 text-teal-800 dark:text-teal-200",
  blocked: "border-red-400 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200",
  preview: "border-purple-400 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200",
  merged: "border-emerald-400 bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200",
  completed: "border-green-400 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200",
  cancelled: "border-neutral-400 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  planning: "Planning",
  needs_review: "Needs Review",
  approved: "Approved",
  on_deck: "On Deck",
  in_process: "In Process",
  commit_ready: "Commit Ready",
  blocked: "Blocked",
  preview: "Preview",
  merged: "Merged",
  completed: "Completed",
  cancelled: "Cancelled",
};

const COLUMN_ORDER: TaskStatus[] = [
  "planning",
  "needs_review",
  "approved",
  "on_deck",
  "in_process",
  "commit_ready",
  "blocked",
  "preview",
  "merged",
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
      className="relative overflow-hidden mb-3 p-3 pl-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-150 cursor-pointer dark:hover:shadow-lg transform hover:scale-101 transition-transform"
      onClick={() => onClick(task.id)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: task.project?.color || "#3B82F6" }} />
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate flex-1" title={task.name}>
          {task.name}
        </h3>
      </div>

      {task.project?.name && (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 truncate">
          {task.project.name}
        </p>
      )}

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
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
            task.task_type === "feature"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
          }`}
        >
          {task.task_type}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {timeSince(new Date(task.updated_at))} ago
        </span>
      </div>
    </div>
  );
}

export default function TasksPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading tasks...</div>}>
      <TasksPage />
    </Suspense>
  );
}

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [completedDays, setCompletedDays] = useState(7);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const taskParam = searchParams.get("task");
    if (taskParam) {
      setSelectedTaskId(taskParam);
    }
  }, [searchParams]);

  const fetchTasks = useCallback(async () => {
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
  }, [completedDays]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const channel = supabaseClient
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newTask = payload.new as Task;
          // Realtime payload doesn't include joined project data — fetch it
          fetch(`/api/tasks`)
            .then(res => res.json())
            .then((data: Task[]) => {
              const freshTask = data.find(t => t.id === newTask.id);
              if (freshTask) {
                setTasks(prev => [freshTask, ...prev.filter(t => t.id !== freshTask.id)]);
              }
            })
            .catch(() => {
              // Fallback: insert without project data, will show on next reload
              setTasks(prev => [newTask, ...prev]);
            });
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Task;
          // Preserve the existing project data since realtime doesn't include joins
          setTasks(prev => prev.map(t =>
            t.id === updated.id ? { ...updated, project: t.project } : t
          ));
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const status of columns) {
      initial[status] = (grouped[status]?.length || 0) > 0;
    }
    setExpandedGroups(initial);
  }, [tasks, showCancelled]);

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

  const toggleGroup = (status: string) => {
    setExpandedGroups(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const selectTask = (taskId: string | null) => {
    setSelectedTaskId(taskId);
    const url = new URL(window.location.href);
    if (taskId) {
      url.searchParams.set("task", taskId);
    } else {
      url.searchParams.delete("task");
    }
    window.history.replaceState({}, "", url.toString());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative pt-14 md:pt-0">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          {/* Search bar */}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          
          {/* Button group */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewTask(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New Task
            </button>
            <button
              onClick={() => setShowCancelled(!showCancelled)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {showCancelled ? "Hide Cancelled" : "Show Cancelled"}
            </button>
            <button
              onClick={() => setActivityOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              <Clock size={16} />
              Recent Activity
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No tasks yet. Create one via Telegram.
        </div>
      ) : (
        <>
          <div className="hidden md:block flex-1 overflow-x-auto p-4">
            <div className="flex gap-4 h-full min-w-max">
              {columns.map((status) => {
                const columnTasks = grouped[status];
                return (
                  <div
                    key={status}
                    className="flex flex-col w-[250px] shrink-0 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
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
                          <TaskCard key={task.id} task={task} onClick={selectTask} />
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

          {/* Mobile list view */}
          <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-2">
            {columns.map((status) => {
              const columnTasks = grouped[status];
              const isExpanded = expandedGroups[status] ?? false;
              return (
                <div key={status} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => toggleGroup(status)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 ${STATUS_COLORS[status]} text-sm font-semibold`}
                  >
                    <span>{STATUS_LABELS[status]} ({columnTasks.length})</span>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {isExpanded && (
                    <div className="p-2 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                      {columnTasks.length === 0 ? (
                        <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">No tasks</div>
                      ) : (
                        columnTasks.map((task) => (
                          <TaskCard key={task.id} task={task} onClick={selectTask} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Task Detail Panel */}
      <TaskDetailPanel taskId={selectedTaskId} onClose={() => selectTask(null)} />

      {/* New Task Modal */}
      <NewTaskModal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        onCreated={fetchTasks}
      />

      {/* Recent Activity Panel */}
      <RecentActivityPanel
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        onSelectTask={(taskId) => {
          setActivityOpen(false);
          selectTask(taskId);
        }}
      />
    </div>
  );
}