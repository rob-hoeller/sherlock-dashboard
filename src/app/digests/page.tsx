"use client";
import { useEffect, useState, useRef } from "react";
import { ScrollText, Calendar, Search, X } from "lucide-react";

interface Digest {
  file_path: string;
  file_name: string;
  size_bytes: number;
  updated_at: string;
  snippet?: string;
}

export default function DigestsPage() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const contentRef = useRef<HTMLPreElement | null>(null);

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

  useEffect(() => {
    if (content && debouncedSearchTerm) {
      setTimeout(() => {
        const preElement = contentRef.current;
        if (!preElement) return;

        const searchRegex = new RegExp(debouncedSearchTerm, "gi");
        let match;
        let highlightedContent = "";
        let lastIndex = 0;

        while ((match = searchRegex.exec(content)) !== null) {
          highlightedContent += content.slice(lastIndex, match.index);
          highlightedContent += `<mark class="bg-amber-200 dark:bg-amber-800 text-zinc-900 dark:text-zinc-100 rounded px-0.5">${match[0]}</mark>`;
          lastIndex = searchRegex.lastIndex;
        }
        highlightedContent += content.slice(lastIndex);

        preElement.innerHTML = highlightedContent;

        const firstMark = preElement.querySelector("mark");
        if (firstMark) {
          firstMark.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [content, debouncedSearchTerm]);

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
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1" dangerouslySetInnerHTML={{ __html: d.snippet }} />
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
              <pre ref={contentRef} className="text-sm text-zinc-900 dark:text-zinc-300 whitespace-pre-wrap break-words font-mono leading-relaxed">
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