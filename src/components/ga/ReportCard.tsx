"use client";

import type { GaViewState } from "@/lib/ga-view";

/** Cumulative, real, uncapped run totals — safe to read at any moment, live or paused. */
export default function ReportCard({ state }: { state: GaViewState }) {
  const latest = state.history[state.history.length - 1];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Stat label="Generations run" value={state.generation.toString()} />
      <Stat label="Strategies created" value={state.strategiesCreatedTotal.toString()} />
      <Stat label="Eliminated" value={state.eliminatedTotal.toString()} tone="red" />
      <Stat label="Quarantined" value={state.quarantinedTotal.toString()} tone="amber" />
      <Stat label="Repeat mistakes blocked" value={state.repeatsBlockedTotal.toString()} tone="amber" />
      <Stat label="Best training fitness" value={state.bestEverFitness !== null ? state.bestEverFitness.toFixed(4) : "—"} />
      <Stat label="Best unseen-data equity" value={latest ? latest.testEquity.toFixed(4) : "—"} />
      <Stat label="Buy & hold (same window)" value={latest ? latest.buyAndHoldEquity.toFixed(4) : "—"} />
    </div>
  );
}

function Stat({ label, value, tone = "emerald" }: { label: string; value: string; tone?: "emerald" | "red" | "amber" }) {
  const color = tone === "red" ? "text-red-300" : tone === "amber" ? "text-amber-300" : "text-emerald-300";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
      <div className={`font-data text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
