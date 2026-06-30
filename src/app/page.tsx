"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

export default function HomePage() {
  const price = useStore((s) => s.price);
  const priceChangePercent = useStore((s) => s.priceChangePercent);
  const volume24h = useStore((s) => s.volume24h);
  const latency = useStore((s) => s.latency);

  return (
    <div className="relative overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#22c55e1a,_transparent_55%),radial-gradient(circle_at_bottom,_#a855f71a,_transparent_60%)]" />

      {/* LIVE TICKER */}
      <div className="relative border-b border-slate-800/70 bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-4 py-2 font-data text-[11px] text-slate-300">
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
            <span className="circuit-node" />
            live feed
          </span>
          <span className="text-slate-400">BTC/USDT</span>
          <span className="text-slate-100">{price ? price.toFixed(2) : "—"}</span>
          <span className={priceChangePercent >= 0 ? "text-emerald-300" : "text-red-300"}>
            {priceChangePercent >= 0 ? "+" : ""}
            {priceChangePercent.toFixed(2)}%
          </span>
          <span className="text-slate-400">24h Vol</span>
          <span className="text-slate-100">{(volume24h / 1000).toFixed(1)}K BTC</span>
          <span className="text-slate-400">Latency</span>
          <span className="text-slate-100">{latency}ms</span>
        </div>
      </div>

      {/* HERO */}
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 font-data text-[11px] text-emerald-200">
          <span className="circuit-node" />
          Genetic Algorithm · Live Evolution
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          A trading engine that{" "}
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
            evolves itself
          </span>
          , live, on real BTC/USDT data.
        </h1>

        <p className="mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
          A population of trading strategies competes every generation. The
          fittest survive, breed, and mutate. You can watch every generation
          happen on the GA Dashboard — no canned numbers, no playback.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/trading"
            className="group relative overflow-hidden rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-[1.05]"
          >
            Open trading terminal
          </Link>
          <Link
            href="/ga-dashboard"
            className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-100 transition-all hover:border-emerald-400/50 hover:bg-slate-900"
          >
            Watch the GA evolve
          </Link>
        </div>

        {/* CIRCUIT PIPELINE DIAGRAM */}
        <div className="circuit-grid relative mt-16 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60 p-6 sm:p-10">
          <p className="relative z-10 mb-6 font-data text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Live data pipeline
          </p>
          <PipelineDiagram price={price} />
        </div>
      </div>

      {/* PILLARS */}
      <section className="relative border-t border-slate-800 bg-slate-950/90">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
          <Pillar
            title="Real evolution, not playback"
            body="The population genuinely evolves on real Binance candles each generation. There's no pre-recorded sequence — what you watch is computed live."
          />
          <Pillar
            title="Fee-aware, drawdown-penalized"
            body="Fitness rewards consistent, fee-adjusted returns and punishes risky drawdowns, so the GA can't win by gambling once and getting lucky."
          />
          <Pillar
            title="Full transparency"
            body="Every generation, every genome, every signal is visible on the GA Dashboard and logged to Bot History."
          />
        </div>
      </section>

      {/* TEAM */}
      <section className="relative border-t border-slate-800 bg-slate-950/95">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="font-data text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
            The team
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Three students, one trading engine.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <TeamCard initial="E" role="UX & Systems Engineering" title="Co-Founder & Chief UX/UI Systems Officer" />
            <TeamCard initial="G" role="Quant Strategy & Market Intelligence" title="Co-Founder & Chief Economic Strategy Officer" />
            <TeamCard initial="Y" role="Algorithmic Systems & Infrastructure" title="Co-Founder & Chief Algorithmic Systems Officer" />
          </div>
        </div>
      </section>
    </div>
  );
}

function PipelineDiagram({ price }: { price: number }) {
  const stages = [
    { label: "Binance feed", sub: "Live WS ticks" },
    { label: "GA population", sub: "24 strategies" },
    { label: "Fitness scoring", sub: "Fee + drawdown aware" },
    { label: "Signal", sub: price ? `$${price.toFixed(0)}` : "—" },
  ];

  return (
    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex flex-1 items-center gap-4">
          <div className="hud-corners led-edge flex-1 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2">
              <span className="circuit-node" />
              <span className="text-xs font-semibold text-slate-100">{stage.label}</span>
            </div>
            <div className="mt-1 font-data text-[11px] text-emerald-300">{stage.sub}</div>
          </div>
          {i < stages.length - 1 && (
            <svg viewBox="0 0 40 10" className="hidden h-3 w-8 sm:block">
              <path d="M0 5 H40" className="circuit-trace" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="led-edge rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
      <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
      <p className="mt-2 text-xs text-slate-300">{body}</p>
    </div>
  );
}

function TeamCard({ initial, role, title }: { initial: string; role: string; title: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-emerald-400 text-sm font-bold text-slate-950">
          {initial}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-50">{role}</div>
          <div className="text-[11px] text-slate-400">{title}</div>
        </div>
      </div>
    </div>
  );
}
