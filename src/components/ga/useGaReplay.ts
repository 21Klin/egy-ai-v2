"use client";

/**
 * Drives the /ga-demo "Replay" mode: lists this account's saved runs,
 * loads one run's full generation history, and steps through it at an
 * adjustable speed — entirely client-side, never touching the live
 * useGaStore singleton (so replaying never corrupts the live run).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getRunGenerations, listRuns, type GenerationDoc, type RunSummary } from "@/lib/ga-persistence";
import { deriveReplayState, EMPTY_GA_VIEW_STATE, type GaViewState } from "@/lib/ga-view";

export const REPLAY_SPEED_OPTIONS = [
  { label: "0.5x", ms: 2000 },
  { label: "1x", ms: 1000 },
  { label: "2x", ms: 500 },
  { label: "4x", ms: 250 },
] as const;

export function useGaReplay(uid: string | null) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [docs, setDocs] = useState<GenerationDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState<number>(1000);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoadingRuns(true);
    setError(null);
    listRuns(uid)
      .then((r) => setRuns(r))
      .catch((e: any) => setError(e.message || "Failed to load saved runs."))
      .finally(() => setLoadingRuns(false));
  }, [uid]);

  const loadRun = useCallback(
    async (runId: string) => {
      if (!uid) return;
      setLoadingDocs(true);
      setError(null);
      setPlaying(false);
      try {
        const g = await getRunGenerations(uid, runId);
        setDocs(g);
        setIndex(0);
        setSelectedRunId(runId);
      } catch (e: any) {
        setError(e.message || "Failed to load that run's generations.");
      } finally {
        setLoadingDocs(false);
      }
    },
    [uid]
  );

  useEffect(() => {
    if (!playing || docs.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => {
      setIndex((i) => {
        if (i >= docs.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, speedMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speedMs, docs.length]);

  const clampedIndex = docs.length === 0 ? 0 : Math.min(index, docs.length - 1);
  const state: GaViewState = docs.length === 0 ? EMPTY_GA_VIEW_STATE : deriveReplayState(docs, clampedIndex);

  return {
    runs,
    loadingRuns,
    selectedRunId,
    loadRun,
    docs,
    loadingDocs,
    error,
    index: clampedIndex,
    setIndex,
    playing,
    setPlaying,
    speedMs,
    setSpeedMs,
    state,
  };
}
