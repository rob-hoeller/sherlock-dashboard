"use client";
import { useEffect, useState } from "react";
import { ScrollText, Calendar } from "lucide-react";

interface Digest { file_path: string; file_name: string; size_bytes: number; updated_at: string; }

export default function DigestsPage() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    fetch("/api/digests").then((r) => r.json()).then((d: Digest[]) => {
      if (!Array.isArray(d)) return;
      setDigests(d);
      if (d.length > 0) {
        const dateMatch = d[0].file_name.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) loadDigest(dateMatch[1]);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDigest = async (date: string) => {
    setSelected(date);
    const res = await fetch(`/api/digests?date=${date}`);
    const data = await res.json();
    setContent(data.content || "");
  };

  const getDate = (name: string) => {
    const m = name.match(/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : name;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📋 Daily Digests</h1>
      <p className="text-zinc-500 text-sm">{digests.length} digests available</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden max-h-[80vh] overflow-y-auto">
          {digests.map((d) => {
            const date = getDate(d.file_name);
            return (
              <button
                key={d.file_path}
                onClick={() => loadDigest(date)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800 text-left ${
                  selected === date ? "bg-amber-500/10 text-amber-400" : ""
                }`}
              >
                <Calendar size={16} className="text-zinc-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{date}</p>
                  <p className="text-xs text-zinc-500">{(d.size_bytes / 1024).toFixed(1)} KB</p>
                </div>
              </button>
            );
          })}
          {digests.length === 0 && (
            <p className="px-4 py-8 text-zinc-600 text-sm text-center">No digests found</p>
          )}
        </div>

        <div className="lg:col-span-2 bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-h-[80vh] overflow-y-auto">
          {selected ? (
            <>
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800">
                <ScrollText size={18} className="text-amber-400" />
                <h2 className="font-medium">Digest — {selected}</h2>
              </div>
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {content}
              </pre>
            </>
          ) : (
            <p className="text-zinc-600 text-sm text-center py-16">Select a digest to view</p>
          )}
        </div>
      </div>
    </div>
  );
}
