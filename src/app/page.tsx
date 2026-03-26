"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Project } from '@/lib/types';

interface UsageRow {
  summary_date: string;
  provider: string;
  model: string;
  api_calls: number;
  session_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_cost: number;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

type Metric = 'cost' | 'calls' | 'input' | 'output';

function metricValue(row: UsageRow, metric: Metric): number {
  switch (metric) {
    case 'cost': return row.total_cost;
    case 'calls': return row.api_calls;
    case 'input': return row.input_tokens;
    case 'output': return row.output_tokens;
  }
}

export default function Home() {
  const [data, setData] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(getDaysAgo(7));
  const [endDate, setEndDate] = useState(getToday());
  const [preset, setPreset] = useState("Last 7d");
  const [selectedMetric, setSelectedMetric] = useState<Metric>('calls');
  const [modelColors, setModelColors] = useState<Record<string, string>>({});
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();
  const [taskCounts, setTaskCounts] = useState({ active: 0, needsReview: 0, blocked: 0, preview: 0 });
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/usage?start=${startDate}&end=${endDate}`)
      .then((r) => r.json())
      .then((res) => setData(res.usage || []))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  useEffect(() => {
    fetch('/api/colors')
      .then((r) => r.json())
      .then((colors) => setModelColors(colors));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    async function fetchTaskCounts() {
      try {
        const res = await fetch("/api/tasks");
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const active = data.filter((t: { status: string }) => t.status !== "completed" && t.status !== "cancelled").length;
        const needsReview = data.filter((t: { status: string }) => t.status === "needs_review").length;
        const blocked = data.filter((t: { status: string }) => t.status === "blocked").length;
        const preview = data.filter((t: { status: string }) => t.status === "preview").length;
        setTaskCounts({ active, needsReview, blocked, preview });
      } catch { /* ignore */ }
    }
    fetchTaskCounts();
  }, []);

  useEffect(() => {
    fetch('/api/projects?active=true')
      .then(res => res.json())
      .then(setProjects)
      .catch(console.error);
  }, []);

  const applyPreset = (p: string) => {
    setPreset(p);
    const today = getToday();
    if (p === "Last 7d") {
      setStartDate(getDaysAgo(7));
      setEndDate(today);
    } else if (p === "Last 30d") {
      setStartDate(getDaysAgo(30));
      setEndDate(today);
    } else if (p === "Last 90d") {
      setStartDate(getDaysAgo(90));
      setEndDate(today);
    } else if (p === "All") {
      setStartDate("2020-01-01");
      setEndDate(today);
    }
  };

  const handleMetricSelect = (metric: Metric) => {
    setSelectedMetric(metric);
  };

  const byDayModel: Record<string, Record<string, number>> = {};
  for (const e of data) {
    const label = e.model === "unknown" ? e.provider : e.model;
    if (!byDayModel[e.summary_date]) {
      byDayModel[e.summary_date] = {};
    }
    byDayModel[e.summary_date][label] = (byDayModel[e.summary_date][label] || 0) + metricValue(e, selectedMetric);
  }

  const dailyDataWithModels = Object.entries(byDayModel).map(([date, costs]) => ({
    date: date.slice(5),
    ...costs,
  })).sort((a, b) => a.date.localeCompare(b.date));

  const byModel: Record<string, number> = {};
  for (const e of data) {
    const label = e.model === "unknown" ? e.provider : e.model;
    byModel[label] = (byModel[label] || 0) + metricValue(e, selectedMetric);
  }
  const modelData = Object.entries(byModel)
    .map(([name, value]) => ({ name, value: +value.toFixed(4) }))
    .sort((a, b) => b.value - a.value);

  const totalCost = data.reduce((s, e) => s + metricValue(e, 'cost'), 0);
  const totalCalls = data.reduce((s, e) => s + metricValue(e, 'calls'), 0);
  const totalInput = data.reduce((s, e) => s + metricValue(e, 'input'), 0);
  const totalOutput = data.reduce((s, e) => s + metricValue(e, 'output'), 0);

  // Sort models by selected metric descending
  const sortedModels = modelData.map(model => model.name).sort((a, b) => byModel[b] - byModel[a]);

  const barChartTitle = {
    cost: "Daily Cost",
    calls: "Daily API Calls",
    input: "Daily Input Tokens",
    output: "Daily Output Tokens"
  }[selectedMetric];

  const pieChartTitle = {
    cost: "Cost by Model",
    calls: "API Calls by Model",
    input: "Input Tokens by Model",
    output: "Output Tokens by Model"
  }[selectedMetric];

  const barChartYAxisFormatter = (v: number) => {
    switch (selectedMetric) {
      case 'cost': return `$${v}`;
      case 'calls': return v.toLocaleString();
      default: return fmt(v);
    }
  };

  const tooltipFormatter = (v: number, name: string) => {
    switch (selectedMetric) {
      case 'cost': return [`$${v.toFixed(4)}`, name];
      case 'calls': return [v.toLocaleString(), name];
      default: return [fmt(v), name];
    }
  };

  const pieTooltipFormatter = (v: number) => {
    switch (selectedMetric) {
      case 'cost': return [`$${v.toFixed(4)}`, selectedMetric];
      case 'calls': return [v.toLocaleString(), selectedMetric];
      default: return [fmt(v), selectedMetric];
    }
  };

  const handleProjectChange = (value: string) => {
    const projectId = value === 'all' ? null : value;
    setSelectedProjectId(projectId);
    localStorage.setItem('dashboard-project-filter', projectId || '');
  };

  return (
    <div className="space-y-8 pt-14 md:pt-0">
      <div>
        <div
          className="flex items-center gap-6 bg-white dark:bg-zinc-900 rounded-xl px-5 py-3 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors w-fit"
          onClick={() => router.push("/tasks")}
        >
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Active Tasks</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{taskCounts.active}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-xs text-amber-500 dark:text-amber-400">Needs Review</p>
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{taskCounts.needsReview}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-red-500 dark:text-red-400">Blocked</p>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">{taskCounts.blocked}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-500 dark:text-purple-400">Preview</p>
              <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">{taskCounts.preview}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex flex-wrap gap-2">
          {["Last 7d", "Last 30d", "Last 90d", "All"].map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                preset === p
                  ? "bg-amber-400/20 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30"
                  : "text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPreset("Custom"); }}
            className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-300"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPreset("Custom"); }}
            className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-300"
          />
        </div>
      </div>

      {/* Project filter */}
      <div className="flex items-center gap-4">
        <Select
          value={selectedProjectId || 'all'}
          onValueChange={handleProjectChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(project => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span>{project.name}</span>
                  </div>
                </SelectItem>
              ))
            }
          </SelectContent>
        </Select>
      </div>

      {loading && <Loading />}
      
      {!loading && (
        <>
          {data.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="API Calls" value={totalCalls.toLocaleString()} onClick={() => handleMetricSelect('calls')} selected={selectedMetric === 'calls'} />
                <StatCard label="Input Tokens" value={fmt(totalInput)} onClick={() => handleMetricSelect('input')} selected={selectedMetric === 'input'} />
                <StatCard label="Output Tokens" value={fmt(totalOutput)} onClick={() => handleMetricSelect('output')} selected={selectedMetric === 'output'} />
                <StatCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} onClick={() => handleMetricSelect('cost')} selected={selectedMetric === 'cost'} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">{barChartTitle}</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dailyDataWithModels} margin={{ bottom: 40 }}>
                      <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={barChartYAxisFormatter} />
                      <Tooltip
                        contentStyle={{
                          background: isDark ? "#18181b" : "#ffffff",
                          border: `1px solid ${isDark ? "#27272a" : "#e4e4e7"}`,
                          borderRadius: 8,
                          color: isDark ? "#fafafa" : "#18181b",
                        }}
                        labelStyle={{
                          color: isDark ? "#fafafa" : "#18181b",
                        }}
                        itemStyle={{
                          color: isDark ? "#fafafa" : "#18181b",
                        }}
                        formatter={tooltipFormatter}
                      />
                      {sortedModels.map((model) => (
                        <Bar key={model} dataKey={model} stackId="metric" fill={modelColors[model] || "#71717a"} radius={[4, 4, 0, 0]} />
                      ))}
                      <Legend
                        iconType="circle"
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="left"
                        wrapperStyle={{ fontSize: '12px', color: '#71717a', paddingTop: "16px" }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">{pieChartTitle}</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {modelData.map((entry) => (
                          <Cell key={entry.name} fill={modelColors[entry.name] || "#71717a"} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: isDark ? "#18181b" : "#ffffff",
                          border: `1px solid ${isDark ? "#27272a" : "#e4e4e7"}`,
                          borderRadius: 8,
                          color: isDark ? "#fafafa" : "#18181b",
                        }}
                        labelStyle={{
                          color: isDark ? "#fafafa" : "#18181b",
                        }}
                        itemStyle={{
                          color: isDark ? "#fafafa" : "#18181b",
                        }}
                        formatter={pieTooltipFormatter}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <Empty msg="No usage data for this range." />
          )}
        </>
      )}

    </div>
  );
}

function StatCard({ label, value, onClick, selected }: { label: string; value: string; onClick: () => void; selected: boolean }) {
  return (
    <button
      className={`bg-white dark:bg-zinc-900 rounded-xl p-4 border transition-colors ${
        selected ? "border-amber-500 ring-2 ring-amber-500" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      } cursor-pointer`}
      onClick={onClick}
    >
      <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">{value}</p>
    </button>
  );
}

function Loading() {
  return <div className="text-zinc-500 p-8">Loading usage data...</div>;
}

function Empty({ msg }: { msg: string }) {
  return <div className="text-zinc-500 p-8">{msg}</div>;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}