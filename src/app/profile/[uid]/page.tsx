"use client";

export const runtime = 'edge';

import { useEffect, useState } from "react";
import { readPublicProfile, type PublicProfile } from "@/lib/public-profile";
import Link from "next/link";

const STAT_META: Record<
  keyof NonNullable<PublicProfile["stats"]>,
  { label: string; icon: string; color: string; fmt: (v: number) => string }
> = {
  manualTrades: { label: "Manual Trades", icon: "🖱️", color: "text-blue-300", fmt: (v) => `${v}` },
  leverageTrades: { label: "Leverage Trades", icon: "⚡", color: "text-purple-300", fmt: (v) => `${v}` },
  botTrades: { label: "Bot Trades", icon: "🤖", color: "text-emerald-300", fmt: (v) => `${v}` },
  gaGenerations: { label: "GA Generations", icon: "🧬", color: "text-cyan-300", fmt: (v) => `${v}` },
  winRate: { label: "Win Rate", icon: "🎯", color: "text-emerald-300", fmt: (v) => `${v.toFixed(1)}%` },
  totalPnl: { label: "Total P&L", icon: "💰", color: "text-emerald-300", fmt: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)} USDT` },
  paperEquity: { label: "Paper Balance / Equity", icon: "🏦", color: "text-emerald-300", fmt: (v) => `$${v.toFixed(2)}` },
  botWinRate: { label: "Bot Win Rate", icon: "🏆", color: "text-emerald-300", fmt: (v) => `${v.toFixed(1)}%` },
  bestFitness: { label: "Best Fitness", icon: "⭐", color: "text-cyan-300", fmt: (v) => v.toFixed(4) },
};

function advancementLevel(generations: number, bestFitness: number | null) {
  const profit = bestFitness !== null ? bestFitness - 1 : null; // backtested return as a fraction, e.g. 0.05 = +5%
  if (generations >= 100 && profit !== null && profit >= 0.1) return { label: "Elite Trader", color: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10" };
  if (generations >= 50 && profit !== null && profit >= 0.05) return { label: "Advanced", color: "text-purple-300 border-purple-500/30 bg-purple-500/10" };
  if (generations >= 20 && profit !== null && profit > 0) return { label: "Intermediate", color: "text-blue-300 border-blue-500/30 bg-blue-500/10" };
  if (generations >= 5) return { label: "Developing", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" };
  return { label: "Beginner", color: "text-slate-300 border-slate-500/30 bg-slate-500/10" };
}

export default function PublicProfilePage({ params }: { params: { uid: string } }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readPublicProfile(params.uid)
      .then((p) => {
        setProfile(p);
        setLoading(false);
      })
      .catch(() => {
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

  const visibleStats = (Object.keys(profile.stats) as (keyof NonNullable<PublicProfile["stats"]>)[])
    .map((key) => {
      const meta = STAT_META[key];
      const value = profile.stats[key];
      if (value === undefined) return null;
      return { key, ...meta, value: meta.fmt(value) };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const initial = profile.displayName?.charAt(0)?.toUpperCase() || "?";
  const level = advancementLevel(profile.gaGenerations, profile.bestFitness);
  const profitPct = profile.bestFitness !== null ? (profile.bestFitness - 1) * 100 : null;

  return (
    <div className="circuit-grid min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-10 text-slate-50">
      <div className="relative z-10 mx-auto max-w-3xl space-y-6">

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

          <div className={`rounded-full border px-4 py-1.5 font-data text-xs font-semibold ${level.color}`}>
            {level.label} · {profile.gaGenerations} GA Generations
          </div>
        </section>

        {visibleStats.length > 0 ? (
          <section>
            <h2 className="mb-3 text-center font-data text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Trading Stats
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {visibleStats.map((s) => (
                <div key={s.key} className="led-edge hud-corners rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className={`font-data text-2xl font-bold ${s.color}`}>{s.value}</div>
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
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Levels require BOTH generations run and a profitable best backtest (Developing: 5+ gens;
            Intermediate: 20+ gens and a profitable strategy; Advanced: 50+ gens and +5% backtested
            return; Elite: 100+ gens and +10%).
            {profitPct !== null ? ` Current best backtest: ${profitPct >= 0 ? "+" : ""}${profitPct.toFixed(2)}%.` : " No strategy has been backtested yet."}
            {" "}Out-of-sample (unseen-data) validation isn't in the engine yet — these numbers reflect backtest performance only.
          </p>
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
