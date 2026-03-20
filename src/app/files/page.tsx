"use client";
import { useEffect, useState } from "react";
import { Folder, FileText, ChevronRight } from "lucide-react";

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState("");

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(currentPath)}`)
      .then((r) => r.json())
      .then(setFiles);
  }, [currentPath]);

  const openFile = async (filePath: string) => {
    const res = await fetch(`/api/files?mode=read&path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    setFileContent(data.content);
    setViewingFile(filePath);
  };

  const breadcrumbs = currentPath ? currentPath.split("/") : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📁 Workspace Files</h1>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm text-zinc-400">
        <button onClick={() => { setCurrentPath(""); setFileContent(null); }} className="hover:text-amber-400">workspace</button>
        {breadcrumbs.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight size={14} />
            <button
              onClick={() => { setCurrentPath(breadcrumbs.slice(0, i + 1).join("/")); setFileContent(null); }}
              className="hover:text-amber-400"
            >
              {part}
            </button>
          </span>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* File list */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="divide-y divide-zinc-800">
            {currentPath && (
              <button
                onClick={() => { setCurrentPath(currentPath.split("/").slice(0, -1).join("/")); setFileContent(null); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 text-zinc-400"
              >
                <Folder size={18} /> ..
              </button>
            )}
            {files.map((f) => (
              <button
                key={f.path}
                onClick={() => f.type === "directory" ? setCurrentPath(f.path) : openFile(f.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 text-left ${viewingFile === f.path ? "bg-amber-500/10 text-amber-400" : ""}`}
              >
                {f.type === "directory" ? <Folder size={18} className="text-amber-400" /> : <FileText size={18} className="text-zinc-500" />}
                <span className="flex-1 text-sm truncate">{f.name}</span>
                {f.size !== undefined && <span className="text-xs text-zinc-600">{formatSize(f.size)}</span>}
              </button>
            ))}
            {files.length === 0 && <p className="px-4 py-8 text-zinc-600 text-sm text-center">Empty directory</p>}
          </div>
        </div>

        {/* File viewer */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          {fileContent !== null ? (
            <>
              <p className="text-xs text-zinc-500 mb-3 font-mono">{viewingFile}</p>
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-[70vh] overflow-auto">
                {fileContent}
              </pre>
            </>
          ) : (
            <p className="text-zinc-600 text-sm text-center py-16">Select a file to view</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
