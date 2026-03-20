import fs from "fs";
import path from "path";

const WORKSPACE = process.env.WORKSPACE_PATH || "";

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}

const GOVERNING_FILES = [
  "SOUL.md", "AGENTS.md", "USER.md", "IDENTITY.md",
  "TOOLS.md", "HEARTBEAT.md", "MEMORY.md",
];

export function listFiles(subpath = ""): FileEntry[] {
  const dirPath = path.join(WORKSPACE, subpath);
  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((e) => !e.name.startsWith(".") && e.name !== "node_modules")
    .map((e) => {
      const fullPath = path.join(dirPath, e.name);
      const relPath = path.join(subpath, e.name);
      const stat = fs.statSync(fullPath);
      return {
        name: e.name,
        path: relPath,
        type: e.isDirectory() ? "directory" as const : "file" as const,
        size: e.isFile() ? stat.size : undefined,
        modified: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function readFile(relPath: string): string | null {
  const fullPath = path.join(WORKSPACE, relPath);
  if (!fullPath.startsWith(WORKSPACE)) return null;
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, "utf-8");
}

export function writeGoverningFile(relPath: string, content: string): boolean {
  const fileName = path.basename(relPath);
  if (!GOVERNING_FILES.includes(fileName)) return false;
  const fullPath = path.join(WORKSPACE, relPath);
  if (!fullPath.startsWith(WORKSPACE)) return false;
  fs.writeFileSync(fullPath, content, "utf-8");
  return true;
}

export function listDigests(): { date: string; path: string; size: number }[] {
  if (!fs.existsSync(WORKSPACE)) return [];
  return fs.readdirSync(WORKSPACE)
    .filter((f) => f.startsWith("sherlock-digest-") && f.endsWith(".md"))
    .map((f) => {
      const stat = fs.statSync(path.join(WORKSPACE, f));
      const dateMatch = f.match(/(\d{4}-\d{2}-\d{2})/);
      return {
        date: dateMatch ? dateMatch[1] : f,
        path: f,
        size: stat.size,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function isGoverningFile(name: string): boolean {
  return GOVERNING_FILES.includes(name);
}
