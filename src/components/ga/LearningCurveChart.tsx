"use client";

import { Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import type { GenerationHistoryEntry } from "@/lib/ga-engine";

/**
 * "Did it get smarter?" — the one chart the whole competition pitch rests
 * on. Four real series, one shared axis (all four are equity/fitness
 * multiples centered near 1.0, so there's no unit mismatch to paper over
 * with a second y-axis): best and average train fitness, the champion's
 * equity on data it never trained on, and buy-and-hold on that same
 * window as the honest baseline.
 */
export default function LearningCurveChart({ history }: { history: GenerationHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        No generations yet — start the bot to see the learning curve.
      </div>
    );
  }

  const data = history.map((h) => ({
    generation: h.generation,
    "Best fitness (train)": h.bestFitness,
    "Avg fitness (train)": h.avgFitness,
    "Champion equity (unseen data)": h.testEquity,
    "Buy & hold (same window)": h.buyAndHoldEquity,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="generation"
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#1e293b" }}
            label={{ value: "Generation", position: "insideBottom", offset: -2, fill: "#64748b", fontSize: 11 }}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#1e293b" }}
            width={48}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            labelFormatter={(v) => `Generation ${v}`}
            formatter={(value: number) => value.toFixed(4)}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
          <Line type="monotone" dataKey="Best fitness (train)" stroke="#3987e5" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Avg fitness (train)" stroke="#d95926" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Champion equity (unseen data)" stroke="#199e70" strokeWidth={2} dot={false} />
          <Line
            type="monotone"
            dataKey="Buy & hold (same window)"
            stroke="#64748b"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
