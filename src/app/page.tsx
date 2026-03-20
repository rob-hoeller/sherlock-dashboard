"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(now.setDate(diff)).toISOString().slice(0, 10);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
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
  const [startDate, setStartDate] = useState(getWeekStart());
  const [endDate, setEndDate] = useState(getToday());
  const [preset, setPreset] = useState("WTD");
  const [selectedMetric, setSelectedMetric] = useState<Metric>('cost');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/usage?start=${startDate}&end=${endDate}`)
      .then((r) => r.json())
      .then((res) => setData(res.usage || []))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const applyPreset = (p: string) => {
    setPreset(p);
    const today = getToday();
    if (p === "Today") {
      setStartDate(today);
      setEndDate(today);
    } else if (p === "WTD") {
      setStartDate(getWeekStart());
      setEndDate(today);
    } else if (p === "MTD") {
      setStartDate(getMonthStart());
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

  if (loading) return <Loading />;
  if (!data.length) return <Empty msg="No usage data found for selected range." />;

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

  // Create a mapping of model names to colors
  const modelColors: Record<string, string> = {};
  modelData.forEach((model, index) => {
    modelColors[model.name] = COLORS[index % COLORS.length];
  });

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">🕵️‍♂️ Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">{startDate} to {endDate}</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex flex-wrap gap-2">
          {["Today", "WTD", "MTD", "Last 30d", "Last 90d", "All"].map((p) => (
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} onClick={() => handleMetricSelect('cost')} selected={selectedMetric === 'cost'} />
        <StatCard label="API Calls" value={totalCalls.toLocaleString()} onClick={() => handleMetricSelect('calls')} selected={selectedMetric === 'calls'} />
        <StatCard label="Input Tokens" value={fmt(totalInput)} onClick={() => handleMetricSelect('input')} selected={selectedMetric === 'input'} />
        <StatCard label="Output Tokens" value={fmt(totalOutput)} onClick={() => handleMetricSelect('output')} selected={selectedMetric === 'output'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">{barChartTitle}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyDataWithModels}>
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={barChartYAxisFormatter} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                labelStyle={{ color: "#a1a1aa" }}
                formatter={tooltipFormatter}
              />
              {sortedModels.map((model) => (
                <Bar key={model} dataKey={model} stackId="metric" fill={modelColors[model]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">{pieChartTitle}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {modelData.map((entry) => (
                  <Cell key={entry.name} fill={modelColors[entry.name]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                formatter={pieTooltipFormatter}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
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