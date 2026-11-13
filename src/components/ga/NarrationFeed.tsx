"use client";

/**
 * Live narration — plain-English lines built from REAL deltas between
 * consecutive generations (new champion, eliminations, quarantines,
 * blocked repeats), queued and drained at ~1 line/second so a human can
 * actually follow along instead of a wall of text appearing at once.
 *
 * Nothing here is scripted: every line is derived from the GaViewState
 * the engine (live store or replay) just produced. Mount with a fresh
 * `key` when switching Live/Replay so the diff baseline resets cleanly.
 */

import { useEffect, useRef, useState } from "react";
import type { GaViewState } from "@/lib/ga-view";

type DiffSnapshot = {
  generation: number;
  bestEverFitness: number | null;
  eliminatedTotal: number;
  quarantinedTotal: number;
  repeatsBlockedTotal: number;
};

function snapshotOf(state: GaViewState): DiffSnapshot {
  return {
    generation: state.generation,
    bestEverFitness: state.bestEverFitness,
    eliminatedTotal: state.eliminatedTotal,
    quarantinedTotal: state.quarantinedTotal,
    repeatsBlockedTotal: state.repeatsBlockedTotal,
  };
}

export default function NarrationFeed({ state }: { state: GaViewState }) {
  const queueRef = useRef<string[]>([]);
  const prevRef = useRef<DiffSnapshot | null>(null);
  const [feed, setFeed] = useState<string[]>([]);

  useEffect(() => {
    const prev = prevRef.current;

    if (prev === null) {
      // First render after mount — nothing to diff against yet (this could
      // be generation 0, or a snapshot that's about to hydrate in). Just
      // record the baseline; the hydration jump below reports it honestly.
      prevRef.current = snapshotOf(state);
      return;
    }

    if (state.generation === prev.generation) return;

    // A reset, a replay rewind, or a snapshot/Firestore run hydrating in
    // (generation jumping from 0 straight to N) — NOT one real generation
    // completing. Diffing this as "this generation" would misreport an
    // entire run's cumulative history as a single generation's events.
    // Report the real cumulative totals honestly instead, framed as
    // "so far," and resync.
    if (state.generation < prev.generation || state.generation - prev.generation > 1) {
      if (state.generation > 0) {
        queueRef.current.push(
          `Resuming at generation ${state.generation} — ${state.strategiesCreatedTotal} strategies created, ${state.eliminatedTotal} eliminated, ${state.quarantinedTotal} quarantined, ${state.repeatsBlockedTotal} repeats blocked so far.`
        );
      }
      prevRef.current = snapshotOf(state);
      return;
    }

    const lines: string[] = [];
    const latestHistory = state.history[state.history.length - 1];
    const evaluatedCount = state.recentGenerations[state.recentGenerations.length - 1]?.population.length ?? 24;
    lines.push(`Generation ${state.generation} complete — ${evaluatedCount} strategies evaluated.`);

    const gotBetter = state.bestEverFitness !== null && (prev.bestEverFitness === null || state.bestEverFitness > prev.bestEverFitness);
    if (gotBetter && latestHistory) {
      lines.push(
        `New champion: training fitness ${state.bestEverFitness!.toFixed(4)}, equity on unseen data ${latestHistory.testEquity.toFixed(4)} (buy & hold: ${latestHistory.buyAndHoldEquity.toFixed(4)}).`
      );
    }

    const newEliminated = state.eliminatedTotal - prev.eliminatedTotal;
    if (newEliminated > 0) {
      const sample = state.graveyard.slice(-newEliminated).slice(0, 2);
      sample.forEach((g) => lines.push(`Strategy ${g.id} eliminated — ${g.reason} (training equity ${g.netEquity.toFixed(3)}).`));
      if (newEliminated > sample.length) lines.push(`…and ${newEliminated - sample.length} more eliminated this generation.`);
    }

    const newQuarantined = state.quarantinedTotal - prev.quarantinedTotal;
    if (newQuarantined > 0) {
      lines.push(
        `${newQuarantined} strateg${newQuarantined === 1 ? "y" : "ies"} quarantined — the bot will avoid breeding anything too close to ${newQuarantined === 1 ? "it" : "them"} again.`
      );
    }

    const newBlocked = state.repeatsBlockedTotal - prev.repeatsBlockedTotal;
    if (newBlocked > 0) {
      lines.push(
        `${newBlocked} new ${newBlocked === 1 ? "child" : "children"} blocked — too similar to a quarantined failure. The bot refuses to repeat that mistake.`
      );
    }

    queueRef.current.push(...lines);
    prevRef.current = snapshotOf(state);
  }, [state.generation, state.bestEverFitness, state.eliminatedTotal, state.quarantinedTotal, state.repeatsBlockedTotal]);

  useEffect(() => {
    const id = setInterval(() => {
      if (queueRef.current.length === 0) return;
      const next = queueRef.current.shift()!;
      setFeed((f) => [...f, next].slice(-60));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col-reverse gap-2 overflow-y-auto font-data text-sm sm:text-base">
      {feed.length === 0 ? (
        <p className="text-slate-500">Waiting for the first generation…</p>
      ) : (
        [...feed].reverse().map((line, i) => (
          <p key={feed.length - i} className="border-b border-slate-800/60 pb-2 text-emerald-300 last:border-0">
            {line}
          </p>
        ))
      )}
    </div>
  );
}
