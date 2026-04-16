"use client";
import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCheck, ExternalLink, Inbox, Trash2 } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  icon: string | null;
  category: string | null;
  priority: string | null;
  link_url: string | null;
  task_id: string | null;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function priorityColor(priority: string | null): string {
  switch (priority) {
    case "high":
    case "urgent":
      return "border-l-red-500";
    case "normal":
      return "border-l-amber-500";
    case "low":
      return "border-l-zinc-400";
    default:
      return "border-l-zinc-300 dark:border-l-zinc-700";
  }
}

function categoryIcon(icon: string | null, category: string | null): string {
  if (icon) return icon;
  switch (category) {
    case "task": return "📋";
    case "build": return "🔨";
    case "deploy": return "🚀";
    case "error": return "❌";
    case "review": return "👀";
    default: return "🔔";
  }
}

export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    const url = filter === "unread" ? "/api/notifications?unread=true" : "/api/notifications";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setNotifications(data);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const markRead = async (ids: string[]) => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
    );
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">📬 Inbox</h1>
          <p className="text-zinc-500 text-sm dark:text-zinc-400 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === "all"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === "unread"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Unread
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-300 border-t-amber-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-600">
          <Inbox size={48} strokeWidth={1} />
          <p className="mt-4 text-sm">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 transition-colors border-l-2 ${priorityColor(n.priority)} ${
                n.is_read
                  ? "bg-white dark:bg-zinc-900 opacity-70"
                  : "bg-amber-50/30 dark:bg-amber-900/5"
              } hover:bg-zinc-50 dark:hover:bg-zinc-800/50`}
            >
              <span className="text-lg mt-0.5 shrink-0">{categoryIcon(n.icon, n.category)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm font-medium truncate ${
                      n.is_read
                        ? "text-zinc-600 dark:text-zinc-400"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <span className="shrink-0 w-2 h-2 bg-amber-500 rounded-full" />
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5 line-clamp-2">
                  {n.message}
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1">
                  {timeAgo(n.created_at)}
                  {n.category && (
                    <span className="ml-2 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500 dark:text-zinc-500">
                      {n.category}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {n.link_url && (
                  <a
                    href={n.link_url}
                    target={n.link_url.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    title="Open link"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                {!n.is_read && (
                  <button
                    onClick={() => markRead([n.id])}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    title="Mark as read"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
