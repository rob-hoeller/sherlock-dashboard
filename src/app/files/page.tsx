"use client";
import { useEffect, useState } from "react";
import { Folder, FileText, ChevronRight } from "lucide-react";

interface FileEntry {
  file_path: string;
  file_name: string;
  file_type: string;
  size_bytes?: number;
  content?: string;
  updated_at?: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState("");

  useEffect(() => {
    const url = currentPath
      ? `/api/files?path=${encodeURIComponent(currentPath)}`
      : "/api/files";
    fetch(url).then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) {
        setFiles(data);
      }
    });
  }, [currentPath]);

  const openFile = async (filePath: string) => {
    const res = await fetch(`/api/files?mode=read&path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    setFileContent(data.content);
    setViewingFile(filePath);
  };

  // Build directory tree from flat paths
  const getVisibleEntries = () => {
    const prefix = currentPath ? currentPath + "/" : "";
    const seen = new Set<string>();
    const entries: { name: string; path: string; isDir: boolean; size?: number }[] = [];

    for (const f of files) {
      const rel = f.file_path;
      if (currentPath && !rel.startsWith(prefix)) continue;
      if (!currentPath && rel.includes("/")) {
        // Show top-level dirs
        const dir = rel.split("/")[0];
        if (!seen.has(dir)) {
          seen.add(dir);
          entries.push({ name: dir, path: dir, isDir: true });
        }
        continue;
      }
      if (!currentPath && !rel.includes("/")) {
        entries.push({ name: f.file_name, path: f.file_path, isDir: f.file_type === "directory", size: f.size_bytes });
        continue;
      }
      // Within subdirectory
      const after = rel.slice(prefix.length);
      if (after.includes("/")) {
        const dir = after.split("/")[0];
        if (!seen.has(dir)) {
          seen.add(dir);
          entries.push({ name: dir, path: prefix + dir, isDir: true });
        }
      } else {
        entries.push({ name: f.file_name, path: f.file_path, isDir: false, size: f.size_bytes });
      }
    }

    return entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const breadcrumbs = currentPath ? currentPath.split("/") : [];
  const visible = getVisibleEntries();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📁 Workspace Files</h1>

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
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden max-h-[80vh] overflow-y-auto">
          <div className="divide-y divide-zinc-800">
            {currentPath && (
              <button
                onClick={() => { setCurrentPath(currentPath.split("/").slice(0, -1).join("/")); setFileContent(null); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 text-zinc-400"
              >
                <Folder size={18} /> ..
              </button>
            )}
            {visible.map((f) => (
              <button
                key={f.path}
                onClick={() => f.isDir ? setCurrentPath(f.path) : openFile(f.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 text-left ${viewingFile === f.path ? "bg-amber-500/10 text-amber-400" : ""}`}
              >
                {f.isDir ? <Folder size={18} className="text-amber-400" /> : <FileText size={18} className="text-zinc-500" />}
                <span className="flex-1 text-sm truncate">{f.name}</span>
                {f.size != null && <span className="text-xs text-zinc-600">{fmtSize(f.size)}</span>}
              </button>
            ))}
            {visible.length === 0 && <p className="px-4 py-8 text-zinc-600 text-sm text-center">Empty directory</p>}
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 max-h-[80vh] overflow-y-auto">
          {fileContent !== null ? (
            <>
              <p className="text-xs text-zinc-500 mb-3 font-mono">{viewingFile}</p>
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap break-words font-mono leading-relaxed">
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

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
