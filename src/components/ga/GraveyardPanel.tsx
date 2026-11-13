"use client";

import type { GraveyardEntry } from "@/lib/ga-engine";

const REASON_STYLE: Record<GraveyardEntry["reason"], string> = {
  "lost money": "text-red-300 bg-red-500/10 border-red-500/30",
  "drawdown too high": "text-orange-300 bg-orange-500/10 border-orange-500/30",
  outcompeted: "text-slate-400 bg-slate-500/10 border-slate-500/30",
};

export default function GraveyardPanel({
  graveyard,
  quarantine,
  repeatsBlockedTotal,
  onSelect,
}: {
  graveyard: GraveyardEntry[];
  quarantine: GraveyardEntry[];
  repeatsBlockedTotal: number;
  onSelect?: (entry: GraveyardEntry) => void;
}) {
  const quarantineIds = new Set(quarantine.map((q) => q.id));
  const recent = [...graveyard].reverse().slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="font-data text-xl font-bold text-slate-200">{graveyard.length}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Strategies eliminated</div>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
          <div className="font-data text-xl font-bold text-red-300">{quarantine.length}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Quarantined</div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="font-data text-xl font-bold text-amber-300">{repeatsBlockedTotal}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Repeat mistakes blocked</div>
        </div>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-slate-500">No eliminations yet.</p>
      ) : (
        <div className="space-y-1.5">
          {recent.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelect?.(entry)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-left text-xs transition hover:bg-slate-900/60"
            >
              <div className="flex items-center gap-2">
                <span className="font-data text-slate-400">{entry.id}</span>
                {quarantineIds.has(entry.id) && (
                  <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-red-300">QUARANTINED</span>
                )}
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${REASON_STYLE[entry.reason]}`}>
                {entry.reason}
              </span>
              <span className="font-data text-slate-500">gen {entry.generationDied}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
