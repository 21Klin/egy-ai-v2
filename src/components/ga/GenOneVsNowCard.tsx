"use client";

import type { Genome } from "@/lib/ga-engine";

type Score = { equity: number; buyAndHold: number };

/**
 * The centerpiece honesty check: generation 1's champion vs the current
 * champion, both scored on unseen data. In Live mode that's literally the
 * same test window (closes are still in memory) — a fair side-by-side. In
 * Replay, raw candles aren't persisted (too large per generation), so each
 * side shows the real unseen-data score recorded AT the time it was that
 * run's champion — still real, just not the identical window — and the
 * footnote says so plainly. Either way: if the current champion isn't
 * actually better, this says that, not a flattering spin.
 */
export default function GenOneVsNowCard({
  firstChampionGenome,
  currentChampionGenome,
  gen1,
  current,
  sameWindow,
  currentGeneration,
}: {
  firstChampionGenome: Genome | null;
  currentChampionGenome: Genome | null;
  gen1: Score | null;
  current: Score | null;
  sameWindow: boolean;
  currentGeneration: number;
}) {
  if (!firstChampionGenome || !currentChampionGenome || !gen1 || !current) {
    return (
      <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-slate-500">
        Not enough data yet — need a captured generation-1 champion and a scored current champion to compare.
      </div>
    );
  }

  const delta = current.equity - gen1.equity;
  const improved = delta > 1e-9;
  const same = Math.abs(delta) <= 1e-9;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <GenomeSide title="Generation 1 champion" genome={firstChampionGenome} equity={gen1.equity} buyAndHold={gen1.buyAndHold} />
        <GenomeSide
          title={`Current champion (gen ${currentGeneration})`}
          genome={currentChampionGenome}
          equity={current.equity}
          buyAndHold={current.buyAndHold}
          highlight
        />
      </div>
      <p
        className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          improved
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : same
            ? "border-slate-700 bg-slate-800/40 text-slate-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
        }`}
      >
        {improved
          ? `Improved: +${(delta * 100).toFixed(2)}% more equity on unseen data than generation 1.`
          : same
          ? "No measurable change on unseen data since generation 1 — shown honestly."
          : `Honestly: the current champion is not better than generation 1 on unseen data (${(delta * 100).toFixed(2)}%).`}
      </p>
      <p className="text-xs text-slate-500">
        {sameWindow
          ? "Both scored just now, on this run's current unseen-data window — a fair side-by-side."
          : "Replay mode: each champion is shown on the unseen-data window recorded at its own point in the saved run (raw candles aren't stored) — still a real out-of-sample score for each, just not the identical window."}
      </p>
    </div>
  );
}

function GenomeSide({
  title,
  genome,
  equity,
  buyAndHold,
  highlight,
}: {
  title: string;
  genome: Genome;
  equity: number;
  buyAndHold: number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-purple-500/40 bg-purple-500/5" : "border-slate-800 bg-slate-950/60"}`}>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h3>
      <div className="mb-3 grid grid-cols-5 gap-1 text-center">
        {Object.entries(genome).map(([k, v]) => (
          <div key={k}>
            <div className="text-[9px] uppercase text-slate-500">{k.replace(/([A-Z])/g, " $1").trim()}</div>
            <div className="font-data text-sm text-slate-200">{v}</div>
          </div>
        ))}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-slate-400">Unseen-data equity</span>
        <span className="font-data text-2xl font-bold text-emerald-300">{equity.toFixed(4)}</span>
      </div>
      <div className="flex items-baseline justify-between text-xs text-slate-500">
        <span>Buy &amp; hold (same window)</span>
        <span className="font-data">{buyAndHold.toFixed(4)}</span>
      </div>
    </div>
  );
}
