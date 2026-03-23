"use client";

import { useEffect, useMemo, useState } from "react";
import type { TaskDetail, TaskStatus, TaskDocument, TaskHistory } from "@/types/tasks";
import { X, GithubIcon, ExternalLink, Download } from "lucide-react";

interface TaskDetailPanelProps {
  taskId: string | null;
  onClose: () => void;
}

const STATUS_BADGE: Record<TaskStatus, string> = {
  planning: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  needs_review: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_process: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  preview: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  planning: "Planning",
  needs_review: "Needs Review",
  approved: "Approved",
  in_process: "In Process",
  blocked: "Blocked",
  preview: "Preview",
  completed: "Completed",
  cancelled: "Cancelled",
};

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

function downloadDoc(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function DocRow({ doc }: { doc: TaskDocument }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {doc.file_name}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {doc.doc_type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadDoc(doc.file_name, doc.content)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            aria-label={`Download ${doc.file_name}`}
          >
            <Download size={16} />
          </button>
          <span className="text-xs text-gray-400">{open ? "Hide" : "Show"}</span>
        </div>
      </button>
      {open && (
        <pre className="px-3 py-2 text-xs whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
          {doc.content}
        </pre>
      )}
    </div>
  );
}

function HistoryRow({ entry }: { entry: TaskHistory }) {
  const when = useMemo(() => {
    const d = new Date(entry.changed_at);
    return isNaN(d.getTime()) ? entry.changed_at : `${timeSince(d)} ago`;
  }, [entry.changed_at]);

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-gray-900 dark:text-gray-100 font-medium">
          {entry.previous_status ? `${entry.previous_status} → ` : ""}
          {entry.new_status}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{when}</div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        by {entry.changed_by}
        {entry.note ? ` • ${entry.note}` : ""}
      </div>
    </div>
  );
}

export default function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!taskId) {
        setDetail(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const data: TaskDetail = await res.json();
        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) {
          setDetail(null);
          setError(e instanceof Error ? e.message : "Failed to load task");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const open = Boolean(taskId);

  async function fetchVercelPreview() {
    if (!detail?.id || !detail.branch_name) return;

    try {
      const res = await fetch(`/api/tasks/${detail.id}/vercel`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setDetail((prev) => (prev ? { ...prev, vercel_preview_url: data.vercel_preview_url } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch Vercel preview");
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <div className="text-sm text-gray-500 dark:text-gray-400">Task</div>
            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {detail?.name || (loading ? "Loading..." : "")}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto h-[calc(100vh-56px)]">
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          {detail && (
            <>
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[detail.status]}`}
                >
                  {STATUS_LABEL[detail.status]}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    detail.task_type === "feature"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                  }`}
                >
                  {detail.task_type}
                </span>
              </div>

              {/* Description */}
              <section>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Description
                </h3>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {detail.description || "No description"}
                </p>
              </section>

              {/* Links */}
              {(detail.pr_url || detail.vercel_preview_url || detail.branch_name) && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Links
                  </h3>
                  <div className="mt-2 space-y-2">
                    {detail.pr_url && (
                      <a
                        href={detail.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <GithubIcon size={16} />
                        <span className="truncate">{detail.pr_url}</span>
                      </a>
                    )}
                    {detail.vercel_preview_url ? (
                      <a
                        href={detail.vercel_preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <ExternalLink size={16} />
                        <span className="truncate">{detail.vercel_preview_url}</span>
                      </a>
                    ) : detail.branch_name ? (
                      <button
                        type="button"
                        onClick={fetchVercelPreview}
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <ExternalLink size={16} />
                        Fetch Preview
                      </button>
                    ) : null}
                  </div>
                </section>
              )}

              {/* Blocked reason */}
              {detail.status === "blocked" && detail.blocked_reason && (
                <section className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                  <div className="text-sm font-semibold text-red-800 dark:text-red-200">
                    Blocked
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
                    {detail.blocked_reason}
                  </div>
                </section>
              )}

              {/* Documents */}
              <section>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Documents
                </h3>
                <div className="mt-2 space-y-2">
                  {(detail.documents || []).length === 0 ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      No documents.
                    </div>
                  ) : (
                    detail.documents.map((doc) => <DocRow key={doc.id} doc={doc} />)
                  )}
                </div>
              </section>

              {/* History */}
              <section>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  History
                </h3>
                <div className="mt-2 space-y-3">
                  {(detail.history || []).length === 0 ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      No history.
                    </div>
                  ) : (
                    detail.history.map((h) => <HistoryRow key={h.id} entry={h} />)
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}