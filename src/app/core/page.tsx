"use client";
import { useEffect, useState, useCallback } from "react";
import { Save, FileText, Eye, Pencil } from "lucide-react";

const FILES = ["SOUL.md", "AGENTS.md", "USER.md", "IDENTITY.md", "TOOLS.md", "HEARTBEAT.md", "MEMORY.md"];

export default function GoverningPage() {
  const [selected, setSelected] = useState(FILES[0]);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const loadFile = useCallback(async (name: string) => {
    const res = await fetch(`/api/files?mode=read&path=${encodeURIComponent(name)}`);
    const data = await res.json();
    setContent(data.content || "");
    setOriginal(data.content || "");
    setSaved(false);
  }, []);

  useEffect(() => { loadFile(selected); }, [selected, loadFile]);

  const save = async () => {
    setSaving(true);
    await fetch("/api/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selected, content }),
    });
    setOriginal(content);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const dirty = content !== original;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Core Files</h1>
      <p className="text-zinc-500 text-sm">Edit Sherlock&apos;s configuration files. Changes save to the database and sync back to the host.</p>

      <div className="flex flex-wrap gap-2">
        {FILES.map((f) => (
          <button
            key={f}
            onClick={() => setSelected(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              selected === f ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "text-zinc-400 hover:text-zinc-100 bg-zinc-900 border border-zinc-800"
            }`}
          >
            <FileText size={14} className="inline mr-1.5 -mt-0.5" />{f}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
          <span className="text-sm font-mono text-zinc-400">{selected}</span>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-emerald-400">✓ Saved</span>}
            <button
              onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
              title={mode === "edit" ? "Preview" : "Edit"}
            >
              {mode === "edit" ? <Eye size={16} /> : <Pencil size={16} />}
            </button>
            {dirty && (
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-black rounded-lg text-sm font-medium hover:bg-amber-400 disabled:opacity-50"
              >
                <Save size={14} /> {saving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>
        {mode === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[70vh] bg-transparent p-4 font-mono text-sm text-zinc-300 focus:outline-none resize-none"
            spellCheck={false}
          />
        ) : (
          <pre className="p-4 font-mono text-sm text-zinc-300 whitespace-pre-wrap max-h-[70vh] overflow-auto">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
