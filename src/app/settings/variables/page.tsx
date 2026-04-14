"use client";

import { useEffect, useState } from "react";
import { Key, Eye, EyeOff, Plus, Pencil, Trash2, Search } from "lucide-react";
import VariableModal from "@/components/VariableModal";

interface Variable {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_secret: boolean;
  value: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["all", "github", "spark", "npm", "general"];

const CATEGORY_COLORS: Record<string, string> = {
  github: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  spark: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  npm: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  general: "bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
};

export default function VariablesPage() {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<Variable | null>(null);

  const fetchVariables = async () => {
    setLoading(true);
    const res = await fetch("/api/variables");
    const data = await res.json();
    if (Array.isArray(data)) setVariables(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchVariables();
  }, []);

  const filtered = filter === "all"
    ? variables
    : variables.filter((v) => v.category === filter);

  const toggleReveal = async (name: string) => {
    if (revealedValues[name]) {
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      return;
    }
    const res = await fetch(`/api/variables/${encodeURIComponent(name)}`);
    const data = await res.json();
    if (data.value) {
      setRevealedValues((prev) => ({ ...prev, [name]: data.value }));
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete variable "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/variables/${encodeURIComponent(name)}`, { method: "DELETE" });
    fetchVariables();
  };

  const handleEdit = (v: Variable) => {
    setEditingVar(v);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingVar(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingVar(null);
  };

  const handleModalSave = async () => {
    handleModalClose();
    fetchVariables();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🔐 Global Variables</h1>
          <p className="text-zinc-500 text-sm dark:text-zinc-400">
            Code factory configuration — stored encrypted in Supabase Vault
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Variable
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === cat
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-zinc-500 dark:text-zinc-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-zinc-500 dark:text-zinc-400 text-sm">No variables found.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 text-left text-zinc-500 dark:text-zinc-400">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Value</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-3 font-mono text-zinc-900 dark:text-zinc-100">{v.name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[v.category] || CATEGORY_COLORS.general}`}>
                        {v.category}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-zinc-600 dark:text-zinc-300">
                      {v.is_secret
                        ? revealedValues[v.name] || v.value
                        : v.value}
                      {v.is_secret && (
                        <button
                          onClick={() => toggleReveal(v.name)}
                          className="ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          {revealedValues[v.name] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </td>
                    <td className="py-3 text-zinc-500 dark:text-zinc-400">{v.description || "—"}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(v)}
                          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(v.name)}
                          className="p-1 text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((v) => (
              <div key={v.id} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">{v.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[v.category] || CATEGORY_COLORS.general}`}>
                    {v.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm font-mono text-zinc-600 dark:text-zinc-300">
                  <span>{v.is_secret ? revealedValues[v.name] || v.value : v.value}</span>
                  {v.is_secret && (
                    <button onClick={() => toggleReveal(v.name)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                      {revealedValues[v.name] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
                {v.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{v.description}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => handleEdit(v)} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(v.name)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <VariableModal
        open={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        editVar={editingVar}
      />
    </div>
  );
}