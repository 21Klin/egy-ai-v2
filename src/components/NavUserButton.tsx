"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";

export default function NavUserButton() {
  const { user, loading, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading) return null;

  if (!user) return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow transition hover:scale-[1.05]">
        Login
      </Link>
      <Link href="/signup" className="rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800">
        Sign Up
      </Link>
    </div>
  );

  const initial = user.displayName?.charAt(0) || user.email?.charAt(0) || "U";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-purple-500 text-xs font-bold text-slate-950 shadow transition hover:scale-[1.07]"
      >
        {initial.toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 shadow-xl backdrop-blur z-50">
          <div className="border-b border-slate-800 px-3 py-2.5">
            <p className="text-[10px] text-slate-400">Signed in as</p>
            <p className="truncate text-xs font-semibold text-emerald-300">{user.displayName || user.email}</p>
          </div>
          <Link href="/dashboard" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">
            🔒 My Dashboard
          </Link>
          <Link href={`/profile/${user.uid}`} onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">
            👤 Public Profile
          </Link>
          <button
            onClick={async () => { setOpen(false); await logout(); }}
            className="w-full px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
