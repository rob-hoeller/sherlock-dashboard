"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

interface RecentActivityPanelProps {
  open: boolean;
  onClose: () => void;
  onSelectTask: (taskId: string) => void;
}

interface ActivityEntry {
  id: string;
  task_id: string;
  task_name: string;
  previous_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string;
  note: string | null;
}

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

const STATUS_COLOR: Record<string, string> = {
  planning: "text-zinc-600 dark:text-zinc-300",
  needs_review: "text-amber-600 dark:text-amber-400",
  approved: "text-blue-600 dark:text-blue-400",
  in_process: "text-indigo-600 dark:text-indigo-400",
  blocked: "text-red-600 dark:text-red-400",
  preview: "text-purple-600 dark:text-purple-400",
  completed: "text-green-600 dark:text-green-400",
  cancelled: "text-zinc-500 dark:text-zinc-400",
};

export default function RecentActivityPanel({ open, onClose, onSelectTask }: RecentActivityPanelProps) {
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!open) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/tasks/history");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) setActivities(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load recent activity");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const panelOpen = open;

  const content = useMemo(() => {
    if (loading) return <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>;
    if (error) return <div className="text-sm text-red-600 dark:text-red-400">{error}</div>;
    if (!activities.length) return <div className="text-sm text-zinc-500 dark:text-zinc-400">No recent activity.</div>;

    return (
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {activities.map((a) => {
          const when = (() => {
            const d = new Date(a.changed_at);
            return isNaN(d.getTime()) ? a.changed_at : `${timeSince(d)} ago`;
          })();

          const statusText = a.previous_status
            ? `${a.previous_status} → ${a.new_status}`
            : `→ ${a.new_status}`;

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onClose();
                onSelectTask(a.task_id);
              }}
              className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{a.task_name}</div>
                  <div className={`text-sm ${STATUS_COLOR[a.new_status] || "text-zinc-600 dark:text-zinc-300"}`}>{statusText}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    by {a.changed_by}
                    {a.note ? ` • ${a.note}` : ""}
                  </div>
                </div>
                <div className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">{when}</div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }, [activities, error, loading, onClose, onSelectTask]);

  return (
    <div
      className={`fixed inset-0 z-50 ${panelOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!panelOpen}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          panelOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-xl transition-transform duration-300 ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">Recent Activity</div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-56px)]">{content}</div>
      </div>
    </div>
  );
}
