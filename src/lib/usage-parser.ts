import fs from "fs";
import path from "path";

const SESSIONS_DIR = process.env.SESSIONS_PATH || "";

interface UsageEntry {
  date: string;
  provider: string;
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

interface SessionMeta {
  [key: string]: {
    sessionId: string;
    model: string;
    modelProvider: string;
  };
}

export function parseUsage(startDate: string, endDate: string): UsageEntry[] {
  if (!SESSIONS_DIR || !fs.existsSync(SESSIONS_DIR)) return [];

  const metaPath = path.join(SESSIONS_DIR, "sessions.json");
  if (!fs.existsSync(metaPath)) return [];

  const sessMeta: SessionMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  const idToModel: Record<string, { model: string; provider: string }> = {};
  for (const [, sv] of Object.entries(sessMeta)) {
    idToModel[sv.sessionId || ""] = {
      model: sv.model || "unknown",
      provider: sv.modelProvider || "unknown",
    };
  }

  const byDayModel: Record<string, UsageEntry> = {};
  const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".jsonl"));

  for (const file of files) {
    const sessionId = file.replace(".jsonl", "");
    const meta = idToModel[sessionId] || { model: "unknown", provider: "unknown" };
    const filePath = path.join(SESSIONS_DIR, file);
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        const ts = d.timestamp || "";
        if (ts < startDate || ts >= endDate) continue;
        if (d.type !== "message") continue;

        const usage = d.message?.usage;
        if (!usage || !usage.cost) continue;

        const day = ts.slice(0, 10);
        const key = `${day}:${meta.provider}:${meta.model}`;

        if (!byDayModel[key]) {
          byDayModel[key] = {
            date: day,
            provider: meta.provider,
            model: meta.model,
            calls: 0,
            inputTokens: 0,
            outputTokens: 0,
            cacheRead: 0,
            cacheWrite: 0,
            cost: 0,
          };
        }

        byDayModel[key].calls += 1;
        byDayModel[key].inputTokens += usage.input || 0;
        byDayModel[key].outputTokens += usage.output || 0;
        byDayModel[key].cacheRead += usage.cacheRead || 0;
        byDayModel[key].cacheWrite += usage.cacheWrite || 0;
        byDayModel[key].cost += usage.cost.total || 0;
      } catch {
        continue;
      }
    }
  }

  return Object.values(byDayModel).sort((a, b) => a.date.localeCompare(b.date));
}
