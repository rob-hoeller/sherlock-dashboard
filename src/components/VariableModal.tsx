"use client";

import { useEffect, useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";

interface Variable {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_secret: boolean;
  value: string;
}

interface VariableModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  editVar: Variable | null;
}

export default function VariableModal({ open, onClose, onSave, editVar }: VariableModalProps) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [isSecret, setIsSecret] = useState(true);
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (editVar) {
        setName(editVar.name);
        setValue("");
        setDescription(editVar.description || "");
        setCategory(editVar.category || "general");
        setIsSecret(editVar.is_secret);
      } else {
        setName("");
        setValue("");
        setDescription("");
        setCategory("general");
        setIsSecret(true);
      }
      setShowValue(false);
      setError("");
    }
  }, [open, editVar]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !value.trim()) {
      setError("Name and value are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/variables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim().toUpperCase(),
          value: value.trim(),
          description: description.trim() || null,
          category,
          is_secret: isSecret,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save variable.");
        return;
      }

      onSave();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {editVar ? "Edit Variable" : "Add Variable"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              disabled={!!editVar}
              placeholder="e.g. GITHUB_TOKEN"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Value</label>
            <div className="relative">
              <input
                type={showValue ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={editVar ? "Enter new value" : "Enter value"}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {showValue ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="general">General</option>
              <option value="github">GitHub</option>
              <option value="spark">Spark</option>
              <option value="npm">NPM</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Secret</label>
            <button
              type="button"
              onClick={() => setIsSecret(!isSecret)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isSecret ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isSecret ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}