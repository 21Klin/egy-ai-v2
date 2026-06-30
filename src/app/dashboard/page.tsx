"use client";
import { useAuthStore } from "@/lib/auth-store";
import { useProfileStore } from "@/lib/profile-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrCreateProfile, type UserProfile } from "@/lib/firestore";

const visibilityItems: { key: keyof UserProfile["show"]; label: string; icon: string; desc: string }[] = [
  { key: "manualTrades", label: "Manual Trades", icon: "🖱️", desc: "Spot trades you placed manually" },
  { key: "leverageTrades", label: "Leverage Trades", icon: "⚡", desc: "Leveraged long/short positions" },
  { key: "botTrades", label: "Bot Trades", icon: "🤖", desc: "Trades executed by the GA bot" },
  { key: "gaGenerations", label: "GA Generations", icon: "🧬", desc: "How many evolution cycles your bot has run" },
  { key: "winRate", label: "Win Rate", icon: "🎯", desc: "Your overall trading win percentage" },
  { key: "totalPnl", label: "Total P&L", icon: "💰", desc: "Your total simulated profit/loss" },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const toggleVisibility = useProfileStore((s) => s.toggleVisibility);
  const updateDisplayName = useProfileStore((s) => s.updateDisplayName);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [nameEdit, setNameEdit] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setProfileLoading(false);
      return;
    }
    getOrCreateProfile(user.uid, user.email || "", user.displayName || "")
      .then((p) => {
        setProfile(p);
        setProfileLoading(false);
        setNameEdit(p.displayName);
      })
      .catch(() => setProfileLoading(false));
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-slate-950">
        <span className="font-data text-sm text-slate-400">Loading your dashboard…</span>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center gap-4 bg-slate-950 text-slate-50">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-semibold">Please log in</h1>
        <Link href="/login" className="rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950">
          Go to Login
        </Link>
      </div>
    );
  }

  const handleToggle = async (key: keyof UserProfile["show"]) => {
    const newShow = { ...profile.show, [key]: !profile.show[key] };
    setProfile({ ...profile, show: newShow });
    await toggleVisibility(user.uid, key);
  };

  const saveName = async () => {
    if (nameEdit.trim() && nameEdit !== profile.displayName) {
      await updateDisplayName(user.uid, nameEdit.trim());
      setProfile({ ...profile, displayName: nameEdit.trim() });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
  };

  const stats = [
    { label: "Manual Trades", value: profile.manualTrades, icon: "🖱️", color: "text-blue-300" },
    { label: "Leverage Trades", value: profile.leverageTrades, icon: "⚡", color: "text-purple-300" },
    { label: "Bot Trades", value: profile.botTrades, icon: "🤖", color: "text-emerald-300" },
    { label: "GA Generations", value: profile.gaGenerations, icon: "🧬", color: "text-cyan-300" },
    { label: "Win Rate", value: `${profile.winRate.toFixed(1)}%`, icon: "🎯", color: profile.winRate >= 52 ? "text-emerald-300" : "text-red-300" },
    { label: "Total P&L", value: `${profile.totalPnl >= 0 ? "+" : ""}${profile.totalPnl.toFixed(2)} USDT`, icon: "💰", color: profile.totalPnl >= 0 ? "text-emerald-300" : "text-red-300" },
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-4xl space-y-6">

        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">Private</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">My Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">{user.email}</p>
          </div>
          <Link href={`/profile/${user.uid}`}
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20">
            View public profile →
          </Link>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Your Stats</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="led-edge hud-corners rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{s.icon}</span>{s.label}
                </div>
                <div className={`mt-2 font-data text-2xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">Public Profile Visibility</h2>
          <p className="mb-3 text-xs text-slate-500">Choose what others can see on your public profile.</p>
          <div className="space-y-2">
            {visibilityItems.map((item) => {
              const visible = profile.show[item.key];
              return (
                <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-100">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(item.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${visible ? "bg-emerald-500" : "bg-slate-700"}`}
                  >
                    <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${visible ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Settings</h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div>
              <label className="text-xs text-slate-400">Display name</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={nameEdit}
                  onChange={(e) => setNameEdit(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Your display name"
                />
                <button onClick={saveName}
                  className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30">
                  {nameSaved ? "Saved ✓" : "Save"}
                </button>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-4">
              <div className="text-xs text-slate-400 mb-1">Account</div>
              <div className="font-data text-sm text-slate-300">{user.email}</div>
              <div className="font-data text-[11px] text-slate-500">
                Member since {new Date(profile.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}