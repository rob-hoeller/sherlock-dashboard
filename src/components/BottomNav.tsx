"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { nav } from "@/components/Sidebar";

export default function BottomNav() {
  const path = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications/count');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count ?? 0);
        }
      } catch { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const inboxActive = path === "/inbox" || path.startsWith("/inbox");

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
        <Link
          href="/inbox"
          className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg min-w-0 ${
            inboxActive
              ? "text-amber-600 dark:text-amber-400"
              : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          <div className="relative">
            <Inbox size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight truncate max-w-[56px]">Inbox</span>
        </Link>
      </div>
    </nav>
  );
}