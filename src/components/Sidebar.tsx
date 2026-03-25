"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BarChart3, FileText, ScrollText, Settings, ClipboardList, User, LogOut, Menu } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth";

const nav = [
  { href: "/", label: "Usage", icon: BarChart3 },
  { href: "/core", label: "Core Files", icon: Settings },
  { href: "/digests", label: "Digests", icon: ScrollText },
  { href: "/models", label: "Model Calls", icon: FileText },
  { href: "/tasks", label: "Tasks", icon: ClipboardList }, // Added Tasks link
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !(dropdownRef.current as any).contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside className={`
        fixed left-0 top-0 h-screen bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-50
        transition-transform duration-200 ease-in-out
        w-56
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:w-56
      `}>
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            🕵️‍♂️ Sherlock
          </h1>
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
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon size={20} />
                <span className="text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div
          ref={dropdownRef}
          className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between cursor-pointer"
          onClick={toggleDropdown}
        >
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-zinc-600 text-white flex items-center justify-center mr-2">
              {user?.user_metadata.display_name ? user.user_metadata.display_name[0] : user?.email[0]}
            </div>
            <span className="text-sm truncate">{user?.user_metadata.display_name || user?.email}</span>
          </div>
          {isOpen && (
            <div className="absolute bottom-16 right-4 sm:right-8 bg-white dark:bg-zinc-800 shadow-lg rounded-lg border border-zinc-200 dark:border-zinc-700 w-32">
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
              >
                <User size={16} />
                Profile
              </Link>
              <button
                onClick={signOut}
                className="block px-4 py-2 text-sm text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2 w-full text-left"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}