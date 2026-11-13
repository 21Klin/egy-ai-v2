"use client";

import type { Individual, GraveyardEntry } from "@/lib/ga-engine";

export default function NodeDetailPanel({
  individual,
  graveyardEntry,
  liveTestEquity,
  onClose,
}: {
  individual: Individual;
  /** Set if this individual was eliminated — its stored fate (reason, train fitness, test equity at the time). */
  graveyardEntry: GraveyardEntry | null;
  /** Set if this individual is still alive (elite or newborn) — its test equity computed live against the current test window, since it has no stored fate yet. */
  liveTestEquity: number | null;
  onClose: () => void;
}) {
  const fate = graveyardEntry
    ? `Eliminated at generation ${graveyardEntry.generationDied} — ${graveyardEntry.reason}`
    : individual.origin === "elite"
    ? "Survived as an elite"
    : "Still active — too new to have a fate yet";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-data text-sm font-semibold text-emerald-300">{individual.id}</h3>
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">✕ close</button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        {Object.entries(individual.genome).map(([key, value]) => (
          <div key={key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
            <div className="text-[9px] uppercase tracking-wide text-slate-500">{key.replace(/([A-Z])/g, " $1").trim()}</div>
            <div className="font-data text-sm text-slate-200">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Field label="Origin" value={individual.origin} />
        <Field label="Born generation" value={String(individual.bornGeneration)} />
        <Field label="Parent(s)" value={individual.parentIds.length ? individual.parentIds.join(", ") : "none"} />
        <Field label="Train fitness" value={individual.fitness ? individual.fitness.toFixed(4) : "—"} />
        {graveyardEntry ? (
          <>
            <Field label="Train net equity" value={graveyardEntry.netEquity.toFixed(4)} />
            <Field label="Max drawdown" value={`${(graveyardEntry.maxDrawdown * 100).toFixed(1)}%`} />
            <Field label="Test equity (at death)" value={graveyardEntry.testEquity.toFixed(4)} />
          </>
        ) : liveTestEquity !== null ? (
          <Field label="Test equity (live, current window)" value={liveTestEquity.toFixed(4)} />
        ) : null}
      </div>

      <p className="mt-3 text-[11px] text-slate-400">{fate}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
      <div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-data text-xs text-slate-200">{value}</div>
    </div>
  );
}
