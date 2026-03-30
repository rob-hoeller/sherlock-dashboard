"use client";

import { useEffect, useMemo, useState } from "react";
import type { TaskDetail, TaskStatus, TaskDocument, TaskHistory } from "@/types/tasks";
import { X, GithubIcon, ExternalLink, Download, Check, MessageSquare, Unlock, RefreshCw, XCircle } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import FeedbackDialog from "@/components/FeedbackDialog";

interface TaskDetailPanelProps {
  taskId: string | null;
  onClose: () => void;
}

const STATUS_BADGE: Record<TaskStatus, string> = {
  planning: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  needs_review: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  on_deck: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  in_process: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  commit_ready: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  preview: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  merged: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  planning: "Planning",
  needs_review: "Needs Review",
  approved: "Approved",
  on_deck: "On Deck",
  in_process: "In Process",
  commit_ready: "Quality Assurance",
  blocked: "Blocked",
  preview: "Preview Ready",
  merged: "Merged",
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

function isImageDataUri(content: string): boolean {
  return content.startsWith("data:image/");
}

function downloadDoc(fileName: string, content: string) {
  if (isImageDataUri(content)) {
    const a = document.createElement("a");
    a.href = content;
    a.download = fileName;
    a.click();
  } else {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
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
          <span className="text-xs text-gray-400">
            {open ? "Hide" : isImageDataUri(doc.content) ? "View" : "Show"}
          </span>
        </div>
      </button>
      {open && (
        isImageDataUri(doc.content) ? (
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800">
            <img
              src={doc.content}
              alt={doc.file_name}
              className="max-w-full rounded"
            />
          </div>
        ) : (
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 max-h-96 overflow-y-auto">
            <MarkdownRenderer content={doc.content} className="text-xs" />
          </div>
        )
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackAction, setFeedbackAction] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchingPreview, setFetchingPreview] = useState(false);

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
  }, [taskId, refreshKey]);

  const open = Boolean(taskId);

  async function fetchVercelPreview() {
    if (!detail?.id || !detail.branch_name || fetchingPreview) return;
    setFetchingPreview(true);
    // Null out old values first
    setDetail((prev) => (prev ? { ...prev, vercel_preview_url: null, vercel_deployment_id: null } : prev));
    try {
      const res = await fetch(`/api/tasks/${detail.id}/vercel`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setDetail((prev) => (prev ? { ...prev, vercel_preview_url: data.vercel_preview_url, vercel_deployment_id: data.vercel_deployment_id } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch Vercel preview");
    } finally {
      setFetchingPreview(false);
    }
  }

  const handleAction = async (actionType: string, feedback?: string, files?: Array<{ name: string; content: string; doc_type: string }>) => {
    if (!detail) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/tasks/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: detail.id,
          action_type: actionType,
          payload: {
            feedback: feedback || undefined,
            files: files && files.length > 0 ? files : undefined,
          },
        }),
      });
      if (!res.ok) throw new Error("Action failed");
      setFeedbackOpen(false);
      setRefreshKey((k) => k + 1);
    } catch {
      // Error handling — could show inline error
    } finally {
      setActionLoading(false);
    }
  };

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
        className={`absolute right-0 top-0 h-full w-full md:w-[480px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {detail?.project?.color && (
          <div
            className="h-1 w-full"
            style={{ backgroundColor: detail.project.color }}
          />
        )}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <div className="text-sm text-gray-500 dark:text-gray-400">Task</div>
            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {detail?.name || (loading ? "Loading..." : "")}
            </div>
            {detail?.project?.name && (
              <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {detail.project.name}
              </div>
            )}
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
              {/* Action Buttons */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                {detail.status === "needs_review" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction("approve")}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Check size={16} />
                      Approve Plan
                    </button>
                    <button
                      onClick={() => { setFeedbackAction("request_changes"); setFeedbackOpen(true); }}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <MessageSquare size={16} />
                      Request Changes
                    </button>
                  </div>
                )}

                {detail.status === "blocked" && (
                  <button
                    onClick={() => { setFeedbackAction("resolve_blocker"); setFeedbackOpen(true); }}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Unlock size={16} />
                    Resolve Blocker
                  </button>
                )}

                {detail.status === "preview" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction("complete")}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Check size={16} />
                      Mark as Merged
                    </button>
                    <button
                      onClick={() => { setFeedbackAction("request_preview_changes"); setFeedbackOpen(true); }}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <MessageSquare size={16} />
                      Request Changes
                    </button>
                  </div>
                )}

                {detail.status !== "cancelled" && detail.status !== "completed" && (
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to cancel this task?")) {
                        await handleAction("cancel");
                        onClose();
                      }
                    }}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 mt-2"
                  >
                    <XCircle size={16} />
                    Cancel Task
                  </button>
                )}
              </div>

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
                <MarkdownRenderer content={detail.description || "No description"} />
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
                    {detail.vercel_preview_url && (
                      <a
                        href={detail.vercel_preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <ExternalLink size={16} />
                        <span className="truncate">{detail.vercel_preview_url}</span>
                      </a>
                    )}
                    {detail.branch_name && (
                      <button
                        type="button"
                        onClick={fetchVercelPreview}
                        disabled={fetchingPreview}
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={fetchingPreview ? "animate-spin" : ""} />
                        {fetchingPreview ? "Fetching..." : "Refresh Preview URL"}
                      </button>
                    )}
                  </div>
                </section>
              )}

              {/* Blocked reason */}
              {detail.status === "blocked" && detail.blocked_reason && (
                <section className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                  <div className="text-sm font-semibold text-red-800 dark:text-red-200">
                    Blocked
                  </div>
                  <MarkdownRenderer content={detail.blocked_reason} />
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

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={(feedback, files) => handleAction(feedbackAction, feedback, files)}
        title={
          feedbackAction === "request_changes" ? "Request Changes" :
          feedbackAction === "resolve_blocker" ? "Resolve Blocker" :
          feedbackAction === "request_preview_changes" ? "Request Changes" : "Feedback"
        }
        placeholder={
          feedbackAction === "request_changes" ? "Describe the changes needed..." :
          feedbackAction === "resolve_blocker" ? "Describe how the blocker was resolved..." :
          feedbackAction === "request_preview_changes" ? "Describe the changes needed..." : ""
        }
        showFileUpload={feedbackAction === "request_preview_changes" || feedbackAction === "request_changes"}
        submitLabel="Submit"
        loading={actionLoading}
      />
    </div>
  );
}