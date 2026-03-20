"use client";
import { useEffect, useState } from "react";
import { ArrowUpDown } from "lucide-react";

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

type SortKey = "date" | "model" | "calls" | "cost" | "inputTokens" | "outputTokens";

export default function UsagePage() {
  const [data, setData] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDesc, setSortDesc] = useState(true);
  const [filterModel, setFilterModel] = useState("");

  useEffect(() => {
    fetch("/api/usage?days=90")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-500 p-8">Loading...</div>;

  const models = [...new Set(data.map((e) => e.model))].sort();
  const filtered = filterModel ? data.filter((e) => e.model === filterModel) : data;

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDesc ? -cmp : cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else { setSortKey(key); setSortDesc(true); }
  };

  const totalCost = filtered.reduce((s, e) => s + e.cost, 0);
  const totalCalls = filtered.reduce((s, e) => s + e.calls, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📊 Model Calls & Tokens</h1>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300"
        >
          <option value="">All models</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-sm text-zinc-500">
          {totalCalls.toLocaleString()} calls · ${totalCost.toFixed(2)} total
        </span>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {([
                ["date", "Date"],
                ["model", "Model"],
                ["calls", "Calls"],
                ["inputTokens", "Input"],
                ["outputTokens", "Output"],
                ["cost", "Cost"],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300"
                >
                  <span className="flex items-center gap-1">
                    {label}
                    {sortKey === key && <ArrowUpDown size={12} className="text-amber-400" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {sorted.map((e, i) => (
              <tr key={i} className="hover:bg-zinc-800/50">
                <td className="px-4 py-2.5 font-mono text-zinc-400">{e.date}</td>
                <td className="px-4 py-2.5">
                  <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs">{e.model}</span>
                </td>
                <td className="px-4 py-2.5 text-right">{e.calls}</td>
                <td className="px-4 py-2.5 text-right font-mono text-zinc-400">{e.inputTokens.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right font-mono text-zinc-400">{e.outputTokens.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right font-mono text-amber-400">${e.cost.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="text-center py-8 text-zinc-600">No data</p>}
      </div>
    </div>
  );
}
