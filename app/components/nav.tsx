"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="bg-slate-900 text-white shadow-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="text-lg font-semibold">Content Hub</div>
        <nav className="flex items-center gap-3">
          <Link
            href="/calendar"
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
              pathname === "/calendar"
                ? "bg-slate-700 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Calendar
          </Link>
          <Link
            href="/idea-lab"
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
              pathname === "/idea-lab"
                ? "bg-slate-700 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Idea Lab
          </Link>
        </nav>
      </div>
    </header>
  );
}
