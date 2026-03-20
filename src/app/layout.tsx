import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Sherlock Dashboard",
  description: "Agent operations dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex">
        <Sidebar />
        <main className="flex-1 ml-16 sm:ml-56 p-4 sm:p-8 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
