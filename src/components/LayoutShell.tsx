"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar"; // Fixed import statement
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoginPage) {
    return <>{children}</>;
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={20} className="text-zinc-700 dark:text-zinc-300" />
      </button>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className="flex-1 md:ml-56 p-4 sm:p-8 overflow-auto">
        {children}
      </main>
    </>
  );
}