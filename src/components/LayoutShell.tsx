"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar"; // Fixed import statement

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 ml-16 sm:ml-56 p-4 sm:p-8 overflow-auto">
        {children}
      </main>
    </>
  );
}