"use client";

import { useState } from "react";
import { X, Paperclip } from "lucide-react";
import DragDropZone from "@/components/DragDropZone";

export interface FeedbackFile {
  name: string;
  content: string;
  doc_type: string;
}

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedback: string, files: FeedbackFile[]) => void;
  title: string;
  placeholder?: string;
  showFileUpload?: boolean;
  submitLabel?: string;
  loading?: boolean;
}

export default function FeedbackDialog({
  open,
  onClose,
  onSubmit,
  title,
  placeholder = "",
  showFileUpload = false,
  submitLabel = "Submit",
  loading = false,
}: FeedbackDialogProps) {
  const [feedback, setFeedback] = useState("");
  const [files, setFiles] = useState<FeedbackFile[]>([]);
  const [error, setError] = useState("");

  if (!open) return null;

  const reset = () => {
    setFeedback("");
    setFiles([]);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFiles = (fileList: FileList) => {
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();

      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        reader.onloadend = () => {
          setFiles((prev) => [
            ...prev,
            {
              name: file.name,
              content: reader.result as string,
              doc_type: file.type.startsWith("image/") ? "screenshot" : "reference",
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onloadend = () => {
          setFiles((prev) => [
            ...prev,
            { name: file.name, content: reader.result as string, doc_type: "planning" },
          ]);
        };
        reader.readAsText(file);
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!feedback.trim()) {
      setError("Feedback is required");
      return;
    }

    setError("");
    onSubmit(feedback.trim(), files);
    reset();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {showFileUpload && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Attachments
              </label>
              <DragDropZone
                onFiles={handleFiles}
                multiple
                accept="image/*,.md,.txt,.pdf,text/markdown,text/plain,application/pdf"
              >
                <div className="p-4">
                  <Paperclip className="mx-auto mb-1 text-zinc-400" size={20} />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Click to browse or drag files here</p>
                </div>
              </DragDropZone>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 truncate">
                        <Paperclip size={14} className="shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="p-1 text-zinc-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 p-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
