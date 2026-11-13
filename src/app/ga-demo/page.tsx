"use client";

/**
 * JUDGE DEMO — the presentation centerpiece (task 5b). Full-screen, big
 * text, high contrast, meant to be read from the back of a room.
 *
 * Everything is driven by the real engine. Two modes feed the exact same
 * display components (NarrationFeed, EvolutionTree, LearningCurveChart,
 * GenOneVsNowCard, ReportCard) through one shared shape, GaViewState
 * (src/lib/ga-view.ts):
 *  - Live: the same singleton useGaStore the Trading/GA Dashboard pages
 *    share — starting the bot here shows up there too, and vice versa.
 *  - Replay: a saved Firestore run stepped through locally, never touching
 *    the live store, so a long pre-trained run can be shown in 1-2 minutes
 *    if the venue's internet or Binance access fails.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";
import { useGaStore } from "@/lib/ga-store";
import {
  evaluateGenome,
  splitTrainTest,
  buyAndHoldEquity,
  type Individual,
  type GraveyardEntry,
} from "@/lib/ga-engine";
import type { GaViewState } from "@/lib/ga-view";
import { Switch } from "@/components/ui/switch";
import EvolutionTree from "@/components/ga/EvolutionTree";
import LearningCurveChart from "@/components/ga/LearningCurveChart";
import DiversityMeter from "@/components/ga/DiversityMeter";
import GraveyardPanel from "@/components/ga/GraveyardPanel";
import NodeDetailPanel from "@/components/ga/NodeDetailPanel";
import NarrationFeed from "@/components/ga/NarrationFeed";
import GenOneVsNowCard from "@/components/ga/GenOneVsNowCard";
import ReportCard from "@/components/ga/ReportCard";
import { useGaReplay, REPLAY_SPEED_OPTIONS } from "@/components/ga/useGaReplay";

type Mode = "live" | "replay";

export default function GaDemoPage() {
  const [mode, setMode] = useState<Mode>("live");
  const [selected, setSelected] = useState<Individual | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const uid = useAuthStore((s) => s.user?.uid ?? null);

  // ── LIVE mode: the shared singleton bot ──────────────────────────────
  const price = useStore((s) => s.price);
  const init = useGaStore((s) => s.init);
  const setCurrentPrice = useGaStore((s) => s.setCurrentPrice);
  const running = useGaStore((s) => s.running);
  const start = useGaStore((s) => s.start);
  const stop = useGaStore((s) => s.stop);
  const runOneGeneration = useGaStore((s) => s.runOneGeneration);
  const demoMode = useGaStore((s) => s.demoMode);
  const setDemoMode = useGaStore((s) => s.setDemoMode);
  const resetRun = useGaStore((s) => s.resetRun);
  const loadingHistory = useGaStore((s) => s.loadingHistory);
  const historyError = useGaStore((s) => s.historyError);
  const closes = useGaStore((s) => s.closes);

  const generation = useGaStore((s) => s.generation);
  const population = useGaStore((s) => s.population);
  const bestEverFitness = useGaStore((s) => s.bestEverFitness);
  const bestEverGenome = useGaStore((s) => s.bestEverGenome);
  const firstChampionGenome = useGaStore((s) => s.firstChampionGenome);
  const history = useGaStore((s) => s.history);
  const diversity = useGaStore((s) => s.diversity);
  const graveyard = useGaStore((s) => s.graveyard);
  const quarantine = useGaStore((s) => s.quarantine);
  const repeatsBlockedTotal = useGaStore((s) => s.repeatsBlockedTotal);
  const strategiesCreatedTotal = useGaStore((s) => s.strategiesCreatedTotal);
  const eliminatedTotal = useGaStore((s) => s.eliminatedTotal);
  const quarantinedTotal = useGaStore((s) => s.quarantinedTotal);
  const recentGenerations = useGaStore((s) => s.recentGenerations);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { if (price > 0) setCurrentPrice(price); }, [price, setCurrentPrice]);

  const liveState: GaViewState = useMemo(
    () => ({
      generation, population, bestEverFitness, bestEverGenome, firstChampionGenome,
      history, diversity, graveyard, quarantine, repeatsBlockedTotal,
      strategiesCreatedTotal, eliminatedTotal, quarantinedTotal, recentGenerations,
    }),
    [generation, population, bestEverFitness, bestEverGenome, firstChampionGenome, history, diversity,
      graveyard, quarantine, repeatsBlockedTotal, strategiesCreatedTotal, eliminatedTotal, quarantinedTotal, recentGenerations]
  );

  // ── REPLAY mode: a saved run, stepped through locally ────────────────
  const replay = useGaReplay(uid);

  const state: GaViewState = mode === "live" ? liveState : replay.state;

  // "Did it get smarter?" — gen 1's champion vs current champion, both on
  // unseen data. Live: the SAME window, scored right now. Replay: each
  // champion's own recorded unseen-data score (raw candles aren't stored).
  const genOneVsNow = useMemo(() => {
    if (mode === "live") {
      if (!state.firstChampionGenome || !state.bestEverGenome || closes.length === 0) return null;
      const { test } = splitTrainTest(closes);
      if (test.length < 10) return null;
      const bh = buyAndHoldEquity(test);
      return {
        gen1: { equity: evaluateGenome(state.firstChampionGenome, test).netEquity, buyAndHold: bh },
        current: { equity: evaluateGenome(state.bestEverGenome, test).netEquity, buyAndHold: bh },
        sameWindow: true,
      };
    }
    if (state.history.length === 0) return null;
    const first = state.history[0];
    const last = state.history[state.history.length - 1];
    return {
      gen1: { equity: first.testEquity, buyAndHold: first.buyAndHoldEquity },
      current: { equity: last.testEquity, buyAndHold: last.buyAndHoldEquity },
      sameWindow: false,
    };
  }, [mode, state.firstChampionGenome, state.bestEverGenome, closes, state.history]);

  const selectedGraveyardEntry: GraveyardEntry | null = useMemo(
    () => (selected ? state.graveyard.find((g) => g.id === selected.id) ?? null : null),
    [selected, state.graveyard]
  );
  const selectedLiveTestEquity = useMemo(() => {
    if (!selected || selectedGraveyardEntry || mode !== "live" || closes.length === 0) return null;
    const { test } = splitTrainTest(closes);
    return evaluateGenome(selected.genome, test).netEquity;
  }, [selected, selectedGraveyardEntry, mode, closes]);

  const recentDiversity = state.history.slice(-30).map((h) => h.diversity);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-8 text-slate-50">
      <div className="relative z-10 mx-auto max-w-7xl space-y-8">

        {/* HEADER */}
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.25em] text-purple-300/80">Judge demo</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              Evolution,{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-purple-400 bg-clip-text text-transparent">live</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/ga-dashboard" className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800">
              ← Full dashboard
            </Link>
            <div className="flex overflow-hidden rounded-full border border-slate-700 text-sm font-semibold">
              <button
                onClick={() => setMode("live")}
                className={`px-4 py-2 transition ${mode === "live" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:bg-slate-800"}`}
              >
                Live
              </button>
              <button
                onClick={() => setMode("replay")}
                disabled={!uid}
                title={!uid ? "Log in to replay a saved run" : undefined}
                className={`px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${mode === "replay" ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-slate-800"}`}
              >
                Replay
              </button>
            </div>
          </div>
        </section>

        {/* CONTROLS */}
        {mode === "live" ? (
          <LiveControls
            running={running}
            start={start}
            stop={stop}
            runOneGeneration={runOneGeneration}
            demoMode={demoMode}
            setDemoMode={setDemoMode}
            resetRun={resetRun}
            confirmingReset={confirmingReset}
            setConfirmingReset={setConfirmingReset}
            loadingHistory={loadingHistory}
            historyError={historyError}
            closesCount={closes.length}
          />
        ) : (
          <ReplayControls replay={replay} uid={uid} />
        )}

        {/* GENERATION / SPEED BANNER */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <BigStat label="Generation" value={state.generation > 0 ? state.generation.toString() : "—"} />
          <BigStat label="Repeat mistakes blocked" value={state.repeatsBlockedTotal.toString()} tone="amber" />
          <BigStat label="Quarantined" value={state.quarantinedTotal.toString()} tone="red" />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Diversity</div>
            <DiversityMeter diversity={state.diversity} recent={recentDiversity} />
          </div>
        </section>

        {/* CENTER STAGE: narration + evolution tree */}
        <section className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-200">Live narration</h2>
            <div className="h-[22rem]">
              <NarrationFeed key={mode} state={state} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-200">Evolution tree</h2>
            <p className="mb-3 text-[11px] text-slate-500">
              Last {state.recentGenerations.length} generations · click any node for its genome, parents, and fate.
            </p>
            <EvolutionTree
              recentGenerations={state.recentGenerations}
              currentPopulation={state.population}
              currentGeneration={state.generation}
              graveyard={state.graveyard}
              onSelect={setSelected}
            />
            {selected && (
              <div className="mt-3">
                <NodeDetailPanel
                  individual={selected}
                  graveyardEntry={selectedGraveyardEntry}
                  liveTestEquity={selectedLiveTestEquity}
                  onClose={() => setSelected(null)}
                />
              </div>
            )}
          </div>
        </section>

        {/* SIDE PANELS: champion genome + graveyard/quarantine */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-200">Current champion genome</h2>
            {state.bestEverGenome && state.generation > 0 ? (
              <div className="grid grid-cols-5 gap-3">
                {Object.entries(state.bestEverGenome).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                    <div className="mt-1 font-data text-2xl text-emerald-300">{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No champion yet.</p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-200">Graveyard &amp; quarantine</h2>
            <GraveyardPanel
              graveyard={state.graveyard}
              quarantine={state.quarantine}
              repeatsBlockedTotal={state.repeatsBlockedTotal}
              onSelect={(entry) => {
                const found = [...state.recentGenerations.flatMap((g) => g.population), ...state.population].find((i) => i.id === entry.id);
                if (found) setSelected(found);
              }}
            />
          </div>
        </section>

        {/* DID IT GET SMARTER */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-1 text-xl font-semibold uppercase tracking-wide text-slate-100">Did it get smarter?</h2>
          <p className="mb-4 text-sm text-slate-500">
            Best/avg fitness is scored on training data; champion equity is scored on data it has never seen.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <LearningCurveChart history={state.history} />
            <GenOneVsNowCard
              firstChampionGenome={state.firstChampionGenome}
              currentChampionGenome={state.bestEverGenome}
              gen1={genOneVsNow?.gen1 ?? null}
              current={genOneVsNow?.current ?? null}
              sameWindow={genOneVsNow?.sameWindow ?? true}
              currentGeneration={state.generation}
            />
          </div>
        </section>

        {/* REPORT CARD */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-4 text-xl font-semibold uppercase tracking-wide text-slate-100">Run report</h2>
          <ReportCard state={state} />
        </section>
      </div>
    </div>
  );
}

function BigStat({ label, value, tone = "emerald" }: { label: string; value: string; tone?: "emerald" | "red" | "amber" }) {
  const color = tone === "red" ? "text-red-300" : tone === "amber" ? "text-amber-300" : "text-emerald-300";
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center">
      <div className={`font-data text-4xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function LiveControls({
  running, start, stop, runOneGeneration, demoMode, setDemoMode, resetRun,
  confirmingReset, setConfirmingReset, loadingHistory, historyError, closesCount,
}: {
  running: boolean;
  start: () => void;
  stop: () => void;
  runOneGeneration: () => void;
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  resetRun: () => void;
  confirmingReset: boolean;
  setConfirmingReset: (v: boolean) => void;
  loadingHistory: boolean;
  historyError: string | null;
  closesCount: number;
}) {
  const dataReady = !loadingHistory && !historyError && closesCount > 0;
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <span className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 font-data text-xs">
        <span className={`circuit-node ${running ? "" : "idle"}`} />
        {loadingHistory ? "Loading data…" : running ? "Evolving" : "Paused"}
      </span>
      <button
        onClick={running ? stop : start}
        disabled={!dataReady}
        className="rounded-full bg-gradient-to-r from-emerald-400 to-purple-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-md transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {running ? "Pause" : "Start"}
      </button>
      <button
        onClick={runOneGeneration}
        disabled={running || !dataReady}
        title="Runs exactly one generation, then pauses — for explaining selection, crossover, mutation, and blocking step by step."
        className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next generation (step)
      </button>
      <label className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-sm">
        <Switch checked={demoMode} onCheckedChange={setDemoMode} aria-label="Toggle demo speed" />
        <span className="text-slate-300">{demoMode ? "Demo speed (4s)" : "Normal speed (45s)"}</span>
      </label>
      {confirmingReset ? (
        <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-200">
          <span>Reset to gen 0? Old runs stay saved.</span>
          <button onClick={() => setConfirmingReset(false)} className="rounded-full px-2 py-0.5 text-slate-300 hover:bg-slate-800">Cancel</button>
          <button onClick={() => { resetRun(); setConfirmingReset(false); }} className="rounded-full bg-red-500/20 px-2 py-0.5 font-semibold text-red-200 hover:bg-red-500/30">
            Confirm
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmingReset(true)} className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-800">
          Reset run
        </button>
      )}
      {historyError && <span className="text-sm text-amber-300">Could not load candles: {historyError}</span>}
    </section>
  );
}

function ReplayControls({ replay, uid }: { replay: ReturnType<typeof useGaReplay>; uid: string | null }) {
  if (!uid) {
    return (
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
        Log in to replay a saved run from Firestore — guests only have an in-memory run with nothing saved to replay.
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={replay.selectedRunId ?? ""}
          onChange={(e) => e.target.value && replay.loadRun(e.target.value)}
          disabled={replay.loadingRuns}
          className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200"
        >
          <option value="" disabled>
            {replay.loadingRuns ? "Loading saved runs…" : replay.runs.length === 0 ? "No saved runs found" : "Choose a saved run…"}
          </option>
          {replay.runs.map((r) => (
            <option key={r.runId} value={r.runId}>
              {new Date(r.startedAt).toLocaleString()} · gen {r.generation} · {r.status}
            </option>
          ))}
        </select>
        <button
          onClick={() => replay.setPlaying((p) => !p)}
          disabled={replay.docs.length === 0}
          className="rounded-full bg-gradient-to-r from-emerald-400 to-purple-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-md transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {replay.playing ? "Pause" : "Play"}
        </button>
        <div className="flex overflow-hidden rounded-full border border-slate-700 text-xs font-semibold">
          {REPLAY_SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.ms}
              onClick={() => replay.setSpeedMs(opt.ms)}
              className={`px-3 py-2 transition ${replay.speedMs === opt.ms ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:bg-slate-800"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {replay.error && <span className="text-sm text-amber-300">{replay.error}</span>}
      </div>
      {replay.docs.length > 0 && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={Math.max(0, replay.docs.length - 1)}
            value={replay.index}
            onChange={(e) => replay.setIndex(Number(e.target.value))}
            className="flex-1 accent-purple-400"
          />
          <span className="w-28 shrink-0 text-right font-data text-xs text-slate-400">
            gen {replay.state.generation} / {replay.docs[replay.docs.length - 1]?.generation ?? 0}
          </span>
        </div>
      )}
    </section>
  );
}
