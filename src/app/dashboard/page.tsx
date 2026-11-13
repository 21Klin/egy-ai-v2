"use client";
import { useAuthStore } from "@/lib/auth-store";
import { useProfileStore } from "@/lib/profile-store";
import { useWalletStore, computePositionPnl } from "@/lib/wallet-store";
import { STARTING_BALANCE, winRatePct } from "@/lib/wallet";
import { useGaStore } from "@/lib/ga-store";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { UserProfile } from "@/lib/firestore";

const visibilityItems: { key: keyof UserProfile["show"]; label: string; icon: string; desc: string }[] = [
  { key: "manualTrades", label: "Manual Trades", icon: "🖱️", desc: "Spot trades you placed manually" },
  { key: "leverageTrades", label: "Leverage Trades", icon: "⚡", desc: "Leveraged long/short positions" },
  { key: "botTrades", label: "Bot Trades", icon: "🤖", desc: "Trades executed by the GA bot" },
  { key: "gaGenerations", label: "GA Generations", icon: "🧬", desc: "How many evolution cycles your bot has run" },
  { key: "winRate", label: "Win Rate", icon: "🎯", desc: "Your overall trading win percentage" },
  { key: "totalPnl", label: "Total P&L", icon: "💰", desc: "Your total simulated profit/loss" },
  { key: "paperEquity", label: "Paper Balance / Equity", icon: "🏦", desc: "Your current total paper-trading value" },
  { key: "botWinRate", label: "Bot Win Rate", icon: "🏆", desc: "Win percentage of GA-bot trades only" },
  { key: "bestFitness", label: "Best Fitness", icon: "⭐", desc: "Your bot's best backtested fitness score" },
];

function fmtPct(v: number | null) {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  const profile = useProfileStore((s) => s.profile);
  const profileLoading = useProfileStore((s) => s.loading);
  const toggleVisibility = useProfileStore((s) => s.toggleVisibility);
  const updateDisplayName = useProfileStore((s) => s.updateDisplayName);

  const wallet = useWalletStore();
  const price = useStore((s) => s.price);
  const generation = useGaStore((s) => s.generation);
  const bestEverFitness = useGaStore((s) => s.bestEverFitness);

  const [nameEdit, setNameEdit] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (profile) setNameEdit(profile.displayName);
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  if (authLoading || profileLoading || !profile || wallet.loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-slate-950">
        <span className="font-data text-sm text-slate-400">Loading your dashboard…</span>
      </div>
    );
  }

  if (!user) {
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

  const handleToggle = (key: keyof UserProfile["show"]) => toggleVisibility(user.uid, key);

  const saveName = async () => {
    if (nameEdit.trim() && nameEdit !== profile.displayName) {
      await updateDisplayName(user.uid, nameEdit.trim());
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
  };

  const equity = wallet.usdtBalance + wallet.btcBalance * price + (wallet.position ? computePositionPnl(wallet.position, price) : 0);
  const totalPnl = equity - STARTING_BALANCE;
  const overallWinRate = winRatePct(wallet.closedTrades, wallet.wins);
  const manualWinRate = winRatePct(wallet.manualClosedTrades, wallet.manualWins);
  const leverageWinRate = winRatePct(wallet.leverageClosedTrades, wallet.leverageWins);
  const botWinRate = winRatePct(wallet.botClosedTrades, wallet.botWins);
  const bestFitness = bestEverFitness;

  const stats = [
    { label: "Manual Trades", value: wallet.manualTrades, icon: "🖱️", color: "text-blue-300" },
    { label: "Leverage Trades", value: wallet.leverageTrades, icon: "⚡", color: "text-purple-300" },
    { label: "Bot Trades", value: wallet.botTrades, icon: "🤖", color: "text-emerald-300" },
    { label: "GA Generations", value: generation, icon: "🧬", color: "text-cyan-300" },
    { label: "Win Rate", value: fmtPct(overallWinRate), icon: "🎯", color: overallWinRate === null ? "text-slate-400" : overallWinRate >= 52 ? "text-emerald-300" : "text-red-300" },
    { label: "Total P&L", value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} USDT`, icon: "💰", color: totalPnl >= 0 ? "text-emerald-300" : "text-red-300" },
    { label: "Paper Balance / Equity", value: `$${equity.toFixed(2)}`, icon: "🏦", color: "text-emerald-300" },
    { label: "Bot Win Rate", value: fmtPct(botWinRate), icon: "🏆", color: botWinRate === null ? "text-slate-400" : botWinRate >= 52 ? "text-emerald-300" : "text-red-300" },
    { label: "Best Fitness", value: bestFitness !== null ? bestFitness.toFixed(4) : "—", icon: "⭐", color: "text-cyan-300" },
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
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">Your Stats</h2>
          <p className="mb-3 text-[11px] text-slate-500">
            Every number here comes live from your real paper wallet and bot — nothing is estimated or carried over from before the paper-wallet system.
          </p>
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
          <div className="mt-3 grid grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-center text-xs">
            <div>
              <div className="text-slate-400">Manual win rate</div>
              <div className="mt-1 font-data text-sm font-semibold text-blue-300">{fmtPct(manualWinRate)}</div>
            </div>
            <div>
              <div className="text-slate-400">Leverage win rate</div>
              <div className="mt-1 font-data text-sm font-semibold text-purple-300">{fmtPct(leverageWinRate)}</div>
            </div>
            <div>
              <div className="text-slate-400">Bot win rate</div>
              <div className="mt-1 font-data text-sm font-semibold text-emerald-300">{fmtPct(botWinRate)}</div>
            </div>
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
