"use client";

import { DIVERSITY_FLOOR } from "@/lib/ga-engine";

/**
 * A single live value plus a short trend, not a multi-series chart — this
 * is a stat/gauge, not a comparison. The floor marker is the REAL threshold
 * the engine uses to decide whether to raise mutation (see ga-engine.ts),
 * not a decorative reference line.
 */
export default function DiversityMeter({ diversity, recent }: { diversity: number; recent: number[] }) {
  // Observed range in practice is roughly 0-0.3; clamp the gauge there so the
  // bar stays readable without claiming a precision the metric doesn't have.
  const GAUGE_MAX = 0.3;
  const pct = Math.min(100, (diversity / GAUGE_MAX) * 100);
  const floorPct = Math.min(100, (DIVERSITY_FLOOR / GAUGE_MAX) * 100);
  const isLow = diversity < DIVERSITY_FLOOR;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-slate-400">Population diversity</span>
        <span className={`font-data text-lg font-bold ${isLow ? "text-amber-300" : "text-emerald-300"}`}>
          {diversity.toFixed(3)}
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isLow ? "bg-amber-400" : "bg-gradient-to-r from-emerald-500 to-purple-500"}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
        <div className="absolute inset-y-0 w-px bg-slate-400/70" style={{ left: `${floorPct}%` }} title="Mutation-boost threshold" />
      </div>
      <p className="text-[11px] text-slate-500">
        {isLow
          ? `Below the ${DIVERSITY_FLOOR.toFixed(2)} floor — mutation rate is currently elevated to fight premature convergence.`
          : `Above the ${DIVERSITY_FLOOR.toFixed(2)} floor — normal mutation rate.`}
      </p>
      {recent.length > 1 && (
        <svg viewBox="0 0 100 24" className="h-6 w-full" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#3987e5"
            strokeWidth="1.5"
            points={recent
              .map((v, i) => {
                const x = (i / (recent.length - 1)) * 100;
                const y = 24 - Math.min(24, (v / GAUGE_MAX) * 24);
                return `${x},${y}`;
              })
              .join(" ")}
          />
        </svg>
      )}
    </div>
  );
}
