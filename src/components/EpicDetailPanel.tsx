"use client";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Send,
  CheckCircle2,
  Circle,
  XCircle,
  Loader2,
  Cog,
  User,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import TaskDetailPanel from "@/components/TaskDetailPanel";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface EpicTask {
  id: string;
  name: string;
  status: string;
  task_type: string;
  epic_order: number;
}

interface BreakdownItem {
  order: number;
  name: string;
  description: string;
  type: "pipeline" | "human";
}

interface EpicDetailPanelProps {
  epicId: string | null;
  onClose: () => void;
  onUpdate?: () => void;
}

const TASK_STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={14} className="text-green-500" />,
  cancelled: <XCircle size={14} className="text-zinc-400" />,
  blocked: <XCircle size={14} className="text-red-500" />,
  planning: <Circle size={14} className="text-zinc-400" />,
  in_process: <Loader2 size={14} className="text-indigo-500 animate-spin" />,
};

export default function EpicDetailPanel({ epicId, onClose, onUpdate }: EpicDetailPanelProps) {
  const [epic, setEpic] = useState<Record<string, unknown> | null>(null);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [tasks, setTasks] = useState<EpicTask[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showTasks, setShowTasks] = useState(true);
  const [taskPanelId, setTaskPanelId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!epicId) {
      setEpic(null);
      return;
    }
    fetch(`/api/epics/${epicId}`)
      .then((r) => r.json())
      .then((data) => {
        setEpic(data);
        setConversation(data.conversation || []);
        setBreakdown(data.task_breakdown || []);
        setTasks(data.tasks || []);
      });
  }, [epicId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const sendMessage = async () => {
    if (!input.trim() || !epicId || sending) return;
    const msg = input.trim();
    setInput("");
    setSending(true);

    // Optimistic: show user message immediately
    setConversation((prev) => [
      ...prev,
      { role: "user", content: msg, timestamp: new Date().toISOString() },
    ]);

    try {
      const res = await fetch(`/api/epics/${epicId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation || []);
        if (data.task_breakdown?.length > 0) {
          setBreakdown(data.task_breakdown);
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
    } finally {
      setSending(false);
    }
  };

  const handleApprove = async () => {
    if (!epicId) return;
    setApproving(true);

    try {
      const res = await fetch(`/api/epics/${epicId}/approve`, { method: "POST" });
      if (res.ok) {
        // Reload epic to get created tasks
        const epicRes = await fetch(`/api/epics/${epicId}`);
        const data = await epicRes.json();
        setEpic(data);
        setTasks(data.tasks || []);
        onUpdate?.();
      }
    } catch (e) {
      console.error("Approve error:", e);
    } finally {
      setApproving(false);
    }
  };

  const handleCancel = async () => {
    if (!epicId || !confirm("Cancel this epic? All remaining tasks will be cancelled.")) return;

    await fetch(`/api/epics/${epicId}/cancel`, { method: "POST" });
    const epicRes = await fetch(`/api/epics/${epicId}`);
    const data = await epicRes.json();
    setEpic(data);
    setTasks(data.tasks || []);
    onUpdate?.();
  };

  const handleMarkHumanComplete = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });

    // Also create a history entry
    await fetch("/api/tasks/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: taskId,
        action_type: "complete",
        user_name: "Rob Hoeller",
        payload: { manual_completion: true },
      }),
    });

    // Reload
    const epicRes = await fetch(`/api/epics/${epicId}`);
    const data = await epicRes.json();
    setEpic(data);
    setTasks(data.tasks || []);
    onUpdate?.();
  };

  if (!epicId) return null;

  const status = (epic?.status as string) || "planning";
  const isPlanning = status === "planning";
  const hasBreakdown = breakdown.length > 0;
  const projectName = (epic?.project as Record<string, unknown>)?.name as string || "";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-screen w-full max-w-2xl z-50 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {(epic?.name as string) || "Loading..."}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {projectName && (
                <span className="text-xs text-zinc-500">{projectName}</span>
              )}
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  status === "in_progress"
                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                    : status === "completed"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : status === "cancelled"
                    ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {status.replace("_", " ")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {status !== "completed" && status !== "cancelled" && (
              <button
                onClick={handleCancel}
                className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                Cancel
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X size={18} className="text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Task list (collapsible) */}
        {tasks.length > 0 && (
          <div className="border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <button
              onClick={() => setShowTasks(!showTasks)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <span>Tasks ({tasks.filter((t) => t.status === "completed").length}/{tasks.length})</span>
              {showTasks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showTasks && (
              <div className="px-4 pb-2 space-y-1 max-h-48 overflow-y-auto">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 py-1 group"
                  >
                    {TASK_STATUS_ICON[t.status] || <Circle size={14} className="text-zinc-400" />}
                    <button
                      onClick={() => setTaskPanelId(t.id)}
                      className="text-xs text-zinc-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 truncate text-left flex-1"
                    >
                      {t.epic_order}. {t.name}
                    </button>
                    {t.task_type === "human" && (
                      <span className="text-[9px] px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                        human
                      </span>
                    )}
                    {t.task_type === "human" && t.status !== "completed" && t.status !== "cancelled" && (
                      <button
                        onClick={() => handleMarkHumanComplete(t.id)}
                        className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Done
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pre-approval breakdown (shown during planning) */}
        {isPlanning && hasBreakdown && tasks.length === 0 && (
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500">Proposed Tasks ({breakdown.length})</span>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg transition-colors"
              >
                {approving ? "Creating tasks..." : "✅ Approve & Start"}
              </button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {breakdown.map((item) => (
                <div key={item.order} className="flex items-start gap-2 py-0.5">
                  <span className="text-xs text-zinc-400 w-4 shrink-0">{item.order}.</span>
                  <div className="min-w-0">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">{item.name}</span>
                    {item.type === "human" && (
                      <span className="ml-1 text-[9px] px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                        human
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {conversation.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600">
              <Target size={32} strokeWidth={1} />
              <p className="mt-3 text-sm">Start the conversation to plan this epic</p>
            </div>
          )}

          {conversation.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 ${
                  msg.role === "user"
                    ? "bg-amber-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownRenderer content={msg.content} />
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                <p
                  className={`text-[10px] mt-1 ${
                    msg.role === "user" ? "text-amber-200" : "text-zinc-400 dark:text-zinc-600"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 size={14} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        {status !== "completed" && status !== "cancelled" && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Describe what you want, or answer the PM's questions..."
                rows={2}
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="p-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg transition-colors shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task detail sub-panel */}
      <TaskDetailPanel taskId={taskPanelId} onClose={() => setTaskPanelId(null)} />
    </>
  );
}
