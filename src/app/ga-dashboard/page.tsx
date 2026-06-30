"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useGaStore } from "@/lib/ga-store";

export default function GaDashboardPage() {
  const price = useStore((s) => s.price);

  const init = useGaStore((s) => s.init);
  const setCurrentPrice = useGaStore((s) => s.setCurrentPrice);
  const running = useGaStore((s) => s.running);
  const start = useGaStore((s) => s.start);
  const stop = useGaStore((s) => s.stop);
  const generation = useGaStore((s) => s.generation);
  const population = useGaStore((s) => s.population);
  const bestEverFitness = useGaStore((s) => s.bestEverFitness);
  const bestEverGenome = useGaStore((s) => s.bestEverGenome);
  const lastSignal = useGaStore((s) => s.lastSignal);
  const log = useGaStore((s) => s.log);
  const loadingHistory = useGaStore((s) => s.loadingHistory);
  const historyError = useGaStore((s) => s.historyError);
  const historyLength = useGaStore((s) => s.closes.length);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { if (price > 0) setCurrentPrice(price); }, [price, setCurrentPrice]);

  const topFive = [...population].sort((a, b) => b.fitness - a.fitness).slice(0, 5);
  const maxFitness = Math.max(...topFive.map((i) => Math.max(i.fitness, 0)), 0.01);

  return (
    <div className="circuit-grid relative min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-8 text-slate-50">
      <div className="relative z-10 mx-auto max-w-6xl space-y-6">

        {/* HEADER */}
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-data text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
              Live evolution
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              GA{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              {loadingHistory
                ? "Fetching real BTC/USDT candles from Binance…"
                : historyError
                ? "Could not load historical data."
                : `${historyLength} candles loaded · real genetic algorithm · no fake numbers`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 font-data text-xs">
              <span className={`circuit-node ${running ? "" : "idle"}`} />
              {loadingHistory ? "Loading data…" : running ? "Evolving" : "Idle"}
            </div>
            <button
              onClick={start}
              disabled={running || loadingHistory || !!historyError}
              className="rounded-full bg-gradient-to-r from-emerald-400 to-purple-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-md transition hover:scale-[1.04] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start
            </button>
            <button
              onClick={stop}
              disabled={!running}
              className="rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
            >
              Stop
            </button>
          </div>
        </section>

        {/* LOADING STATE */}
        {loadingHistory && (
          <section className="hud-corners rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
            <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center">
              <span className="circuit-node" />
            </div>
            <p className="text-sm font-semibold text-emerald-300">Fetching historical candles</p>
            <p className="mt-1 text-xs text-slate-400">
              Connecting to Binance REST API — loading 500 real 1-minute BTC/USDT candles for the GA to evolve on.
            </p>
          </section>
        )}

        {/* ERROR STATE */}
        {historyError && !loadingHistory && (
          <section className="hud-corners rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
            <strong>Could not load historical candles:</strong> {historyError}
            <br />
            <span className="text-xs text-amber-300/70">Check your internet connection — the GA needs real Binance data and won&apos;t fabricate numbers without it.</span>
          </section>
        )}

        {/* STAT CARDS */}
        {!loadingHistory && (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Generation" value={generation > 0 ? generation.toString() : "—"} sub="One full evolution cycle every 45s" />
              <StatCard
                label="Best fitness ever"
                value={bestEverFitness > -Infinity ? bestEverFitness.toFixed(4) : "—"}
                sub="Fee-adjusted, drawdown-penalized"
              />
              <StatCard
                label="Last signal"
                value={lastSignal ? lastSignal.action.toUpperCase() : "NONE"}
                sub={lastSignal ? `At $${lastSignal.price.toFixed(2)}` : "Waiting for first generation"}
                tone={lastSignal?.action === "buy" ? "emerald" : lastSignal?.action === "sell" ? "red" : "slate"}
              />
            </section>

            {/* BEST GENOME */}
            <section className="data-flow-border rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-200">
                Best genome parameters
              </h2>
              {generation === 0 ? (
                <p className="text-sm text-slate-500">Start the GA to see the best-evolved strategy parameters.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-5">
                  {Object.entries(bestEverGenome).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="mt-1 font-data text-lg text-emerald-300">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* POPULATION BARS */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-200">
                Population — top 5 by fitness
              </h2>
              {topFive.length === 0 ? (
                <p className="text-sm text-slate-500">Population initializes when the GA starts.</p>
              ) : (
                <div className="space-y-3">
                  {topFive.map((ind) => (
                    <div key={ind.id} className="flex items-center gap-3">
                      <span className="w-16 font-data text-[10px] text-slate-500">
                        IND-{String(ind.id).padStart(2, "0")}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${Math.max(2, (Math.max(ind.fitness, 0) / maxFitness) * 100)}%` }}
                        />
                      </div>
                      <span className="w-16 text-right font-data text-[10px] text-slate-400">
                        {ind.fitness > -Infinity ? ind.fitness.toFixed(3) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* EVOLUTION LOG */}
            <section className="scanline-overlay rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-200">
                Evolution log
              </h2>
              <div className="space-y-1.5 font-data text-xs">
                {log.length === 0 ? (
                  <p className="text-slate-500">
                    No generations recorded yet. Click Start above to begin evolving.
                  </p>
                ) : (
                  log.map((entry, i) => (
                    <div key={i} className="flex gap-3 border-b border-slate-800/60 py-1.5 text-slate-400 last:border-0">
                      <span className="shrink-0 text-slate-600">{new Date(entry.time).toLocaleTimeString()}</span>
                      <span className="text-emerald-400">{entry.message}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, tone = "emerald" }: {
  label: string; value: string; sub: string; tone?: "emerald" | "red" | "slate";
}) {
  const color = tone === "emerald" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-slate-300";
  return (
    <div className="led-edge hud-corners rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 font-data text-3xl font-bold ${color}`}>{value}</div>
      <p className="mt-1 text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}
