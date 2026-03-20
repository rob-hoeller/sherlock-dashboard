import { createClient as supabaseCreateClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  return supabaseCreateClient(supabaseUrl, supabaseAnonKey);
};
"use client";
import { useEffect, useState } from "react";
import { ScrollText, Calendar, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Digest {
  file_path: string;
  file_name: string;
  size_bytes: number;
  updated_at: string;
  snippet?: string; // Added for search snippet
}

export default function DigestsPage() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (searchTerm) {
      timeoutId = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
      }, 300);
    } else {
      setDebouncedSearchTerm("");
    }

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    const fetchDigests = async () => {
      let url = "/api/digests";
      if (debouncedSearchTerm) {
        url += `?search=${encodeURIComponent(debouncedSearchTerm)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setDigests(data);
      if (data.length > 0 && !selected) {
        const dateMatch = data[0].file_name.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) loadDigest(dateMatch[1]);
      }
    };

    fetchDigests();
  }, [debouncedSearchTerm, selected]);

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📋 Daily Digests</h1>
      <p className="text-zinc-500 text-sm dark:text-zinc-400">{digests.length} digests available</p>

      <div className="relative mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search digests..."
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
        {searchTerm && (
          <button onClick={clearSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <X size={16} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300" />
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[70vh] overflow-y-auto">
          {digests.length > 0 ? (
            digests.map((d) => {
              const date = getDate(d.file_name);
              return (
                <button
                  key={d.file_path}
                  onClick={() => loadDigest(date)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-left ${
                    selected === date ? "bg-amber-100/10 text-amber-600 dark:text-amber-400" : ""
                  }`}
                >
                  <Calendar size={16} className="text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{date}</p>
                    {debouncedSearchTerm && d.snippet && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{d.snippet}</p>
                    )}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{(d.size_bytes / 1024).toFixed(1)} KB</p>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="px-4 py-8 text-zinc-500 dark:text-zinc-600 text-sm text-center">
              {debouncedSearchTerm ? "No digests match your search" : "No digests found"}
            </p>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 max-h-[70vh] overflow-y-auto">
          {selected ? (
            <>
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <ScrollText size={18} className="text-amber-500" />
                <h2 className="font-medium">Digest — {selected}</h2>
              </div>
              <pre className="text-sm text-zinc-900 dark:text-zinc-300 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {content}
              </pre>
            </>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-600 text-sm text-center py-16">Select a digest to view</p>
          )}
        </div>
      </div>
    </div>
  );
}

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const date = searchParams.get("date");

  if (date) {
    const { data, error } = await supabase
      .from("files")
      .select("content")
      .eq("file_type", "digest") // Ensure only digests are fetched
      .like("file_name", `%${date}%`)
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } else {
    let query = supabase
      .from("files")
      .select("file_path, file_name, size_bytes, updated_at")
      .eq("file_type", "digest"); // Ensure only digests are fetched

    if (search) {
      query = query.like("content", `%${search}%`).or(`file_name.ilike.%${search}%,snippet.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  }
}