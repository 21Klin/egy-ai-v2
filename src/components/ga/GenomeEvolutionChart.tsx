"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { GenerationHistoryEntry, Genome } from "@/lib/ga-engine";

const GENES: { key: keyof Genome; label: string }[] = [
  { key: "fastMa", label: "Fast MA" },
  { key: "slowMa", label: "Slow MA" },
  { key: "rsiPeriod", label: "RSI Period" },
  { key: "rsiLow", label: "RSI Low" },
  { key: "rsiHigh", label: "RSI High" },
];

/**
 * Five small multiples, not one overlaid chart — fastMa/slowMa (bar count)
 * and rsiLow/rsiHigh (0-100 scale) are different units entirely, so
 * sharing one y-axis (or worse, a second y-axis) would misrepresent both.
 * Each gene only needs its own single line; no categorical color
 * distinction is needed within a single-series chart.
 */
export default function GenomeEvolutionChart({ history }: { history: GenerationHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        No generations yet.
      </div>
    );
  }

  const data = history.map((h) => ({ generation: h.generation, ...h.bestGenome }));

  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {GENES.map((gene) => (
        <div key={gene.key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{gene.label}</div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="generation" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "#94a3b8" }}
                  labelFormatter={(v) => `Gen ${v}`}
                  formatter={(value: number) => [value, gene.label]}
                />
                <Line type="stepAfter" dataKey={gene.key} stroke="#3987e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 text-right font-data text-sm text-emerald-300">
            {data[data.length - 1][gene.key]}
          </div>
        </div>
      ))}
    </div>
  );
}
