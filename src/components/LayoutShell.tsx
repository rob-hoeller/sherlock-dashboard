"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { NotificationProvider } from "@/lib/notifications";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <NotificationProvider>
      <Sidebar />
      <main className="flex-1 md:ml-56 p-4 sm:p-8 pb-20 md:pb-8 overflow-auto">
        {children}
      </main>
      <BottomNav />
    </NotificationProvider>
  );
}