"use client";

import { useStore } from "@/lib/store";
import { useEquityStore } from "@/lib/equity-store";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function HistoryPage() {
  const botHistory = useStore((state) => state.botHistory);
  const points = useEquityStore((s) => s.points);

  const startValue = points[0]?.value ?? 0;
  const currentValue = points[points.length - 1]?.value ?? 0;
  const totalReturn = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0;

  const chartData = points.map((p) => ({
    time: new Date(p.time).toLocaleTimeString(),
    value: p.value,
  }));

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-6">
        <section>
          <p className="font-data text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
            Bot history
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Every trade,{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-purple-400 bg-clip-text text-transparent">
              fully visible
            </span>
            .
          </h1>
        </section>

        <section className="grid gap-4 text-sm text-slate-200 sm:grid-cols-3">
          <SummaryCard label="Number of trades" value={botHistory.length.toString()} />
          <SummaryCard
            label="Session return"
            value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`}
            tone={totalReturn >= 0 ? "emerald" : "red"}
          />
          <SummaryCard
            label="Most recent trade"
            value={botHistory.length === 0 ? "None yet" : new Date(botHistory[0].time).toLocaleTimeString()}
          />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span>Equity curve (this session)</span>
            <span>{points.length} samples</span>
          </div>
          <div className="h-56 w-full">
            {chartData.length < 2 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Collecting data — keep this tab open while trading or running the GA.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={["dataMin", "dataMax"]} hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Equity"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#equityFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span>Live bot trade log</span>
            <span>Connected to GA strategy on BTC/USDT</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-[0.15em] text-slate-400">
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Side</th>
                  <th className="px-3 py-2 text-left">Entry price (USDT)</th>
                  <th className="px-3 py-2 text-left">Size (BTC)</th>
                </tr>
              </thead>
              <tbody>
                {botHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-xs text-slate-500">
                      No bot trades yet. Start the GA bot on the Trading page.
                    </td>
                  </tr>
                ) : (
                  botHistory.map((trade) => (
                    <tr key={trade.id} className="border-b border-slate-900/80 bg-slate-950/40 last:border-0 hover:bg-slate-900/60">
                      <td className="px-3 py-2 font-data text-[11px]">{new Date(trade.time).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            trade.side === "BUY" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
                          }`}
                        >
                          {trade.side}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-data">{trade.price.toFixed(2)}</td>
                      <td className="px-3 py-2 font-data">{trade.size.toFixed(5)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "red" }) {
  const color = tone === "emerald" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-slate-100";
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 font-data text-lg ${color}`}>{value}</div>
    </div>
  );
}
