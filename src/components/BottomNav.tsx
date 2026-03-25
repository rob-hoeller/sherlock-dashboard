"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/components/Sidebar";

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 md:hidden">
      <div className="flex justify-around items-center h-16 px-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg min-w-0 ${
                active
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] leading-tight truncate max-w-[56px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}