"use client";
import { useEffect, useState } from "react";
import { getPublicProfile, type UserProfile } from "@/lib/firestore";
import Link from "next/link";

export default function PublicProfilePage({ params }: { params: { uid: string } }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔍 Loading public profile for UID:", params.uid);
    
    getPublicProfile(params.uid)
      .then((p) => {
        console.log("📦 Public profile data:", p);
        setProfile(p);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error loading public profile:", err);
        setLoading(false);
      });
  }, [params.uid]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-slate-950">
        <span className="font-data text-sm text-slate-400">Loading profile…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center gap-4 bg-slate-950 text-slate-50">
        <div className="text-4xl">👤</div>
        <h1 className="text-xl font-semibold">Profile not found</h1>
        <p className="text-sm text-slate-400">This user doesn't exist or has no public profile.</p>
        <Link href="/" className="text-sm text-emerald-300 hover:underline">Go home</Link>
      </div>
    );
  }

  const visibleStats = [
    { key: "manualTrades" as const, label: "Manual Trades", icon: "🖱️", value: profile.manualTrades, color: "text-blue-300" },
    { key: "leverageTrades" as const, label: "Leverage Trades", icon: "⚡", value: profile.leverageTrades, color: "text-purple-300" },
    { key: "botTrades" as const, label: "Bot Trades", icon: "🤖", value: profile.botTrades, color: "text-emerald-300" },
    { key: "gaGenerations" as const, label: "GA Generations", icon: "🧬", value: profile.gaGenerations, color: "text-cyan-300" },
    { key: "winRate" as const, label: "Win Rate", icon: "🎯", value: profile.winRate, color: profile.winRate >= 52 ? "text-emerald-300" : "text-red-300", fmt: (v: number) => `${v.toFixed(1)}%` },
    { key: "totalPnl" as const, label: "Total P&L", icon: "💰", value: profile.totalPnl, color: profile.totalPnl >= 0 ? "text-emerald-300" : "text-red-300", fmt: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)} USDT` },
  ].filter((s) => profile.show[s.key]);

  const initial = profile.displayName?.charAt(0)?.toUpperCase() || "?";

  const gaLevel = profile.gaGenerations >= 100 ? { label: "Elite Trader", color: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10" }
    : profile.gaGenerations >= 50 ? { label: "Advanced", color: "text-purple-300 border-purple-500/30 bg-purple-500/10" }
    : profile.gaGenerations >= 20 ? { label: "Intermediate", color: "text-blue-300 border-blue-500/30 bg-blue-500/10" }
    : profile.gaGenerations >= 5 ? { label: "Developing", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" }
    : { label: "Beginner", color: "text-slate-300 border-slate-500/30 bg-slate-500/10" };

  return (
    <div className="circuit-grid min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-10 text-slate-50">
      <div className="relative z-10 mx-auto max-w-3xl space-y-6">

        {/* PROFILE HEADER */}
        <section className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-purple-500 text-3xl font-bold text-slate-950 shadow-lg shadow-purple-500/30">
              {initial}
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
            <p className="mt-1 font-data text-[11px] text-slate-400">
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className={`rounded-full border px-4 py-1.5 font-data text-xs font-semibold ${gaLevel.color}`}>
            {gaLevel.label} · {profile.gaGenerations} GA Generations
          </div>
        </section>

        {/* STATS */}
        {visibleStats.length > 0 ? (
          <section>
            <h2 className="mb-3 text-center font-data text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Trading Stats
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {visibleStats.map((s) => (
                <div key={s.key} className="led-edge hud-corners rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className={`font-data text-2xl font-bold ${s.color}`}>
                    {s.fmt ? s.fmt(s.value) : s.value}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
            <p className="text-sm text-slate-400">This trader keeps their stats private.</p>
          </section>
        )}

        {/* BOT ADVANCEMENT */}
        <section className="data-flow-border rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">Bot Advancement</h2>
          <div className="mb-2 flex justify-between font-data text-xs text-slate-400">
            <span>Generations evolved</span>
            <span className="text-emerald-300">{profile.gaGenerations} / 100</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(profile.gaGenerations, 100)}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1">
            {[
              { label: "Beginner", at: 0 },
              { label: "Developing", at: 5 },
              { label: "Intermediate", at: 20 },
              { label: "Advanced", at: 50 },
              { label: "Elite", at: 100 },
            ].map((tier) => (
              <div key={tier.label} className={`text-center font-data text-[9px] ${profile.gaGenerations >= tier.at ? "text-emerald-300" : "text-slate-600"}`}>
                {tier.label}
              </div>
            ))}
          </div>
        </section>

        <div className="text-center">
          <Link href="/trading" className="text-xs text-emerald-300 hover:underline">
            Try EGY-AI yourself →
          </Link>
        </div>

      </div>
    </div>
  );
}