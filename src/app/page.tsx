"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface UsageEntry {
  date: string;
  provider: string;
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Home() {
  const [data, setData] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage?days=30")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-500 p-8">Loading usage data...</div>;
  if (!data.length) return <div className="text-zinc-500 p-8">No usage data found. Check SESSIONS_PATH in .env.local</div>;

  // Aggregate by day
  const byDay: Record<string, number> = {};
  for (const e of data) {
    byDay[e.date] = (byDay[e.date] || 0) + e.cost;
  }
  const dailyData = Object.entries(byDay)
    .map(([date, cost]) => ({ date: date.slice(5), cost: +cost.toFixed(4) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Aggregate by model
  const byModel: Record<string, number> = {};
  for (const e of data) {
    const label = e.model.split("/").pop() || e.model;
    byModel[label] = (byModel[label] || 0) + e.cost;
  }
  const modelData = Object.entries(byModel)
    .map(([name, value]) => ({ name, value: +value.toFixed(4) }))
    .sort((a, b) => b.value - a.value);

  // Totals
  const totalCost = data.reduce((s, e) => s + e.cost, 0);
  const totalCalls = data.reduce((s, e) => s + e.calls, 0);
  const totalInput = data.reduce((s, e) => s + e.inputTokens, 0);
  const totalOutput = data.reduce((s, e) => s + e.outputTokens, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">🕵️‍♂️ Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">Last 30 days</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} />
        <StatCard label="API Calls" value={totalCalls.toLocaleString()} />
        <StatCard label="Input Tokens" value={formatTokens(totalInput)} />
        <StatCard label="Output Tokens" value={formatTokens(totalOutput)} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">Daily Cost</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                labelStyle={{ color: "#a1a1aa" }}
                formatter={(v: number) => [`$${v.toFixed(4)}`, "Cost"]}
              />
              <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">Cost by Model</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {modelData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                formatter={(v: number) => [`$${v.toFixed(4)}`, "Cost"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
