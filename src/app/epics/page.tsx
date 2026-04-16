"use client";
import { useEffect, useState, useCallback } from "react";
import { Target, Plus, ChevronRight } from "lucide-react";
import EpicDetailPanel from "@/components/EpicDetailPanel";
import EpicCreateModal from "@/components/EpicCreateModal";

interface Epic {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  project: { id: string; name: string; color: string } | null;
  task_progress: { total: number; completed: number };
}

const STATUS_BADGE: Record<string, string> = {
  planning: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

const STATUS_LABEL: Record<string, string> = {
  planning: "Planning",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function EpicsPage() {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/epics");
    if (res.ok) {
      setEpics(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">🎯 Epics</h1>
          <p className="text-zinc-500 text-sm dark:text-zinc-400 mt-1">
            Break big features into sequential tasks
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Epic
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-300 border-t-amber-500" />
        </div>
      ) : epics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-600">
          <Target size={48} strokeWidth={1} />
          <p className="mt-4 text-sm">No epics yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {epics.map((epic) => {
            const progress = epic.task_progress;
            const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

            return (
              <button
                key={epic.id}
                onClick={() => setSelectedId(epic.id)}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-left hover:border-amber-400 dark:hover:border-amber-600 transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {epic.name}
                  </h3>
                  <ChevronRight size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                </div>

                {epic.project && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-2">
                    {epic.project.name}
                  </p>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      STATUS_BADGE[epic.status] || STATUS_BADGE.planning
                    }`}
                  >
                    {STATUS_LABEL[epic.status] || epic.status}
                  </span>
                </div>

                {progress.total > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                      <span>{progress.completed}/{progress.total} tasks</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-2">
                  {new Date(epic.created_at).toLocaleDateString()}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <EpicDetailPanel
        epicId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdate={load}
      />

      {showCreate && (
        <EpicCreateModal
          onClose={() => setShowCreate(false)}
          onCreate={(id) => {
            setShowCreate(false);
            load();
            setSelectedId(id);
          }}
        />
      )}
    </div>
  );
}
