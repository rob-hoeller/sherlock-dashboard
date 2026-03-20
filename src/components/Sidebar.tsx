"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, ScrollText, Settings } from "lucide-react";

const nav = [
  { href: "/", label: "Usage", icon: BarChart3 },
  { href: "/core", label: "Core Files", icon: Settings },
  { href: "/digests", label: "Digests", icon: ScrollText },
  { href: "/models", label: "Model Calls", icon: FileText },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 sm:w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col z-50">
      <div className="p-3 sm:p-4 border-b border-zinc-800">
        <h1 className="hidden sm:block text-lg font-bold tracking-tight">
          🕵️‍♂️ Sherlock
        </h1>
        <span className="sm:hidden text-2xl block text-center">🕵️‍♂️</span>
      </div>
      <nav className="flex-1 p-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                active
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              <Icon size={20} />
              <span className="hidden sm:inline text-sm">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 sm:p-4 border-t border-zinc-800 text-xs text-zinc-500 hidden sm:block">
        Baker Street v0.1
      </div>
    </aside>
  );
}
