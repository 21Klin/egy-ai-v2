'use client';

/**
 * SINGLETON GA STORE
 * ------------------------------------------------------------
 * Earlier version of this exposed the GA as a React hook
 * (useGaEngine), but that meant every component calling it
 * created its OWN independent population — so the Trading
 * page's GA bot and the GA Dashboard page would silently
 * evolve two different, disagreeing populations. That's a real
 * bug, not just a style preference: it breaks the promise that
 * starting the bot on one page shows up correctly on the other.
 *
 * Fixing it by making the GA engine global app state via
 * Zustand (same pattern as the rest of the app's store), so
 * there is exactly one population, one generation counter, one
 * log — shared by every component that reads this store.
 *
 * Persistence has two layers: localStorage (always, instant, works
 * offline/logged-out) and Firestore (best-effort, logged-in only —
 * see ga-persistence.ts). Firestore writes are fire-and-forget and
 * never block a generation from completing locally; if they fail
 * (offline, or the account's Firestore rules aren't deployed yet),
 * the bot keeps running off localStorage exactly as it always has.
 */

import { create } from 'zustand';
import {
  Individual,
  Genome,
  GenerationHistoryEntry,
  GraveyardEntry,
  initialPopulation,
  evolveGeneration,
  splitTrainTest,
  fetchHistoricalCloses,
  saveSnapshot,
  loadSnapshot,
  MAX_POSSIBLE_SLOW_MA,
  TRAIN_RATIO,
} from './ga-engine';
import { createRun, saveRunState, appendGenerationDoc, getLatestRun } from './ga-persistence';

const GENERATION_INTERVAL_MS = 45 * 1000; // normal: 45s per generation
const DEMO_INTERVAL_MS = 4 * 1000; // demo mode (task 5): ~3-5s so judges watch many generations live
const HISTORY_REFRESH_INTERVAL_MS = 2 * 60 * 1000; // re-fetch fresh candles every 2 minutes while running
const MAX_HISTORY_ENTRIES = 300;
const MAX_RECENT_GENERATIONS = 16; // the lineage tree shows the last ~10-15 generations
// Every genome needs MAX_POSSIBLE_SLOW_MA+5 warm-up bars, and that requirement
// applies independently to both the train slice AND the test slice.
const MIN_CLOSES_FOR_GENERATION = Math.ceil((MAX_POSSIBLE_SLOW_MA + 5) / (1 - TRAIN_RATIO));

type Signal = { action: 'buy' | 'sell' | 'hold'; price: number; time: number };
type LogEntry = { time: number; message: string };
export type RecentGeneration = { generation: number; population: Individual[] };

interface GaStoreState {
  running: boolean;
  demoMode: boolean;
  generation: number;
  population: Individual[];
  bestEverFitness: number | null;
  bestEverGenome: Genome;
  /** Generation 1's champion, captured once and never overwritten — half of the "Gen 1 vs now" comparison. */
  firstChampionGenome: Genome | null;
  lastSignal: Signal | null;
  log: LogEntry[];
  history: GenerationHistoryEntry[];
  diversity: number;
  graveyard: GraveyardEntry[];
  quarantine: GraveyardEntry[];
  repeatsBlockedTotal: number;
  /** Uncapped running totals for the end-of-run report card (graveyard/quarantine arrays above are capped for display). */
  strategiesCreatedTotal: number;
  eliminatedTotal: number;
  quarantinedTotal: number;
  /** Last ~16 generations' full evaluated populations (real fitness, genomes, parentIds) — what the lineage tree draws from. */
  recentGenerations: RecentGeneration[];
  /** Firestore gaRuns/{runId} this account's progress mirrors to. Null for guests, or before the first generation creates one. */
  runId: string | null;
  loadingRun: boolean;
  closes: number[];
  loadingHistory: boolean;
  historyError: string | null;
  currentPrice: number;
  _intervalId: ReturnType<typeof setInterval> | null;
  _historyRefreshIntervalId: ReturnType<typeof setInterval> | null;
  _hasInitialized: boolean;
  _owner: string;

  init: () => void;
  setCurrentPrice: (price: number) => void;
  loadHistory: () => Promise<void>;
  runOneGeneration: () => void;
  start: () => void;
  stop: () => void;
  /** Toggles the presentation cadence (task 5). Live-restarts the interval if already running, so flipping it mid-demo takes effect immediately. */
  setDemoMode: (enabled: boolean) => void;
  /** Starts a fresh run from generation 0 (task 5) — the old run's docs stay in Firestore untouched; the next generation just creates a new run doc. */
  resetRun: () => void;
  /** Switches the bot to a different account's isolated state (stops it, clears in-memory population/log, restores that account's latest Firestore run, falling back to its local snapshot). "guest" for logged-out visitors (localStorage only, never touches Firestore). */
  resetForOwner: (owner: string) => Promise<void>;
}

export const useGaStore = create<GaStoreState>((set, get) => ({
  running: false,
  demoMode: false,
  generation: 0,
  population: [],
  bestEverFitness: null,
  bestEverGenome: initialPopulation()[0].genome,
  firstChampionGenome: null,
  lastSignal: null,
  log: [],
  history: [],
  diversity: 0,
  graveyard: [],
  quarantine: [],
  repeatsBlockedTotal: 0,
  strategiesCreatedTotal: 0,
  eliminatedTotal: 0,
  quarantinedTotal: 0,
  recentGenerations: [],
  runId: null,
  loadingRun: false,
  closes: [],
  loadingHistory: false,
  historyError: null,
  currentPrice: 0,
  _intervalId: null,
  _historyRefreshIntervalId: null,
  _hasInitialized: false,
  _owner: 'guest',

  init: () => {
    if (get()._hasInitialized) return;
    set({ _hasInitialized: true });

    const snap = loadSnapshot(get()._owner);
    if (snap) {
      set({
        generation: snap.generation,
        population: snap.population,
        bestEverFitness: snap.bestEverFitness,
        bestEverGenome: snap.bestEverGenome,
        firstChampionGenome: snap.firstChampionGenome ?? null,
        lastSignal: snap.lastSignal,
        log: snap.log,
        history: snap.history ?? [],
        diversity: snap.history?.[snap.history.length - 1]?.diversity ?? 0,
        graveyard: snap.graveyard ?? [],
        quarantine: snap.quarantine ?? [],
        repeatsBlockedTotal: snap.repeatsBlockedTotal ?? 0,
        strategiesCreatedTotal: snap.strategiesCreatedTotal ?? snap.population?.length ?? 0,
        eliminatedTotal: snap.eliminatedTotal ?? 0,
        quarantinedTotal: snap.quarantinedTotal ?? 0,
        recentGenerations: snap.recentGenerations ?? [],
      });
    } else {
      const fresh = initialPopulation();
      set({ population: fresh, strategiesCreatedTotal: fresh.length });
    }

    get().loadHistory();
  },

  setCurrentPrice: (price) => {
    set({ currentPrice: price });
    const closes = get().closes;
    if (price > 0 && closes.length > 0) {
      // keep the most recent close warm with the live tick so each
      // generation evaluates against current data, not a stale snapshot
      const updated = [...closes];
      updated[updated.length - 1] = price;
      set({ closes: updated });
    }
  },

  loadHistory: async () => {
    set({ loadingHistory: true, historyError: null });
    try {
      const data = await fetchHistoricalCloses();
      set({ closes: data, loadingHistory: false });
    } catch (e: any) {
      set({ historyError: e.message || 'Failed to fetch historical candles from Binance.', loadingHistory: false });
    }
  },

  runOneGeneration: () => {
    const {
      closes, population, currentPrice, generation, bestEverFitness, bestEverGenome, firstChampionGenome,
      log, history, graveyard, quarantine, repeatsBlockedTotal, recentGenerations,
      strategiesCreatedTotal, eliminatedTotal, quarantinedTotal,
    } = get();
    if (closes.length < MIN_CLOSES_FOR_GENERATION) return;

    const { train, test } = splitTrainTest(closes);
    const pop = population.length > 0 ? population : initialPopulation();
    const {
      nextPopulation,
      best,
      signal,
      historyEntry,
      graveyard: nextGraveyard,
      quarantine: nextQuarantine,
      blockedEvents,
      eliminatedThisGeneration,
      evaluatedPopulation,
    } = evolveGeneration(pop, train, test, currentPrice, generation, graveyard, quarantine);

    const isNewBest = bestEverFitness === null || best.fitness > bestEverFitness;
    const updatedBestFitness = isNewBest ? best.fitness : bestEverFitness;
    const updatedBestGenome = isNewBest ? best.genome : bestEverGenome;
    const updatedFirstChampionGenome = historyEntry.generation === 1 && !firstChampionGenome ? best.genome : firstChampionGenome;
    const signalWithTime: Signal = { ...signal, time: Date.now() };

    const generationLogEntry: LogEntry = {
      time: Date.now(),
      message: isNewBest
        ? `Gen ${historyEntry.generation}: new best fitness ${best.fitness.toFixed(4)} (fast ${best.genome.fastMa}/slow ${best.genome.slowMa}) — unseen-data equity ${historyEntry.testEquity.toFixed(4)}`
        : `Gen ${historyEntry.generation}: best fitness ${best.fitness.toFixed(4)} — unseen-data equity ${historyEntry.testEquity.toFixed(4)}, diversity ${historyEntry.diversity.toFixed(3)}`,
    };
    const blockLogEntries: LogEntry[] = blockedEvents.map((b) => ({
      time: Date.now(),
      message: `Gen ${b.generation}: blocked child (too similar to failed ${b.tooSimilarToId})`,
    }));
    const nextLog = [generationLogEntry, ...blockLogEntries, ...log].slice(0, 30);
    const nextHistory = [...history, historyEntry].slice(-MAX_HISTORY_ENTRIES);
    const nextRepeatsBlockedTotal = repeatsBlockedTotal + blockedEvents.length;
    const nextRecentGenerations = [...recentGenerations, { generation, population: evaluatedPopulation }].slice(-MAX_RECENT_GENERATIONS);
    const newQuarantineCount = eliminatedThisGeneration.filter((e) => e.reason !== 'outcompeted').length;
    const nextStrategiesCreatedTotal = strategiesCreatedTotal + nextPopulation.length;
    const nextEliminatedTotal = eliminatedTotal + eliminatedThisGeneration.length;
    const nextQuarantinedTotal = quarantinedTotal + newQuarantineCount;

    set({
      generation: historyEntry.generation,
      population: nextPopulation,
      bestEverFitness: updatedBestFitness,
      bestEverGenome: updatedBestGenome,
      firstChampionGenome: updatedFirstChampionGenome,
      lastSignal: signalWithTime,
      log: nextLog,
      history: nextHistory,
      diversity: historyEntry.diversity,
      graveyard: nextGraveyard,
      quarantine: nextQuarantine,
      repeatsBlockedTotal: nextRepeatsBlockedTotal,
      recentGenerations: nextRecentGenerations,
      strategiesCreatedTotal: nextStrategiesCreatedTotal,
      eliminatedTotal: nextEliminatedTotal,
      quarantinedTotal: nextQuarantinedTotal,
    });

    saveSnapshot(
      {
        generation: historyEntry.generation,
        population: nextPopulation,
        bestEverFitness: updatedBestFitness,
        bestEverGenome: updatedBestGenome,
        firstChampionGenome: updatedFirstChampionGenome,
        lastSignal: signalWithTime,
        log: nextLog,
        history: nextHistory,
        graveyard: nextGraveyard,
        quarantine: nextQuarantine,
        repeatsBlockedTotal: nextRepeatsBlockedTotal,
        strategiesCreatedTotal: nextStrategiesCreatedTotal,
        eliminatedTotal: nextEliminatedTotal,
        quarantinedTotal: nextQuarantinedTotal,
        recentGenerations: nextRecentGenerations,
      },
      get()._owner
    );

    // Best-effort Firestore mirror for logged-in accounts — never blocks the
    // generation that already completed locally above, and any failure
    // (offline, rules not deployed yet) just means this generation only
    // lives in localStorage until the next one succeeds.
    const owner = get()._owner;
    if (owner !== 'guest') {
      (async () => {
        try {
          let runId = get().runId;
          if (!runId) {
            runId = await createRun(owner);
            set({ runId });
          }
          await saveRunState(owner, runId, {
            generation: historyEntry.generation,
            population: nextPopulation,
            bestEverFitness: updatedBestFitness,
            bestEverGenome: updatedBestGenome,
            firstChampionGenome: updatedFirstChampionGenome,
            lastSignal: signalWithTime,
            log: nextLog,
            graveyard: nextGraveyard,
            quarantine: nextQuarantine,
            repeatsBlockedTotal: nextRepeatsBlockedTotal,
            strategiesCreatedTotal: nextStrategiesCreatedTotal,
            eliminatedTotal: nextEliminatedTotal,
            quarantinedTotal: nextQuarantinedTotal,
          });
          await appendGenerationDoc(owner, runId, {
            generation: historyEntry.generation,
            timestamp: Date.now(),
            population: evaluatedPopulation,
            bestFitness: historyEntry.bestFitness,
            avgFitness: historyEntry.avgFitness,
            worstFitness: historyEntry.worstFitness,
            bestGenome: historyEntry.bestGenome,
            testEquity: historyEntry.testEquity,
            buyAndHoldEquity: historyEntry.buyAndHoldEquity,
            diversity: historyEntry.diversity,
            eliminated: eliminatedThisGeneration,
            blockedCount: historyEntry.blockedCount,
          });
        } catch {
          // non-fatal — see file header
        }
      })();
    }
  },

  start: () => {
    if (get()._intervalId) return;
    set({ running: true });
    get().runOneGeneration();
    const id = setInterval(() => get().runOneGeneration(), get().demoMode ? DEMO_INTERVAL_MS : GENERATION_INTERVAL_MS);
    const historyId = setInterval(() => get().loadHistory(), HISTORY_REFRESH_INTERVAL_MS);
    set({ _intervalId: id, _historyRefreshIntervalId: historyId });
  },

  stop: () => {
    const id = get()._intervalId;
    if (id) clearInterval(id);
    const historyId = get()._historyRefreshIntervalId;
    if (historyId) clearInterval(historyId);
    set({ running: false, _intervalId: null, _historyRefreshIntervalId: null });
  },

  setDemoMode: (enabled) => {
    set({ demoMode: enabled });
    const id = get()._intervalId;
    if (id) {
      // already running — restart the generation timer so the new cadence
      // takes effect immediately instead of after the current wait finishes
      clearInterval(id);
      const newId = setInterval(() => get().runOneGeneration(), enabled ? DEMO_INTERVAL_MS : GENERATION_INTERVAL_MS);
      set({ _intervalId: newId });
    }
  },

  resetRun: () => {
    get().stop();
    const fresh = initialPopulation();
    const owner = get()._owner;
    const resetState = {
      generation: 0,
      population: fresh,
      bestEverFitness: null,
      bestEverGenome: fresh[0].genome,
      firstChampionGenome: null,
      lastSignal: null,
      log: [{ time: Date.now(), message: 'Run reset — starting fresh from generation 0. Previous runs are still saved.' }],
      history: [],
      diversity: 0,
      graveyard: [],
      quarantine: [],
      repeatsBlockedTotal: 0,
      strategiesCreatedTotal: fresh.length,
      eliminatedTotal: 0,
      quarantinedTotal: 0,
      recentGenerations: [],
      runId: null, // the next generation creates a brand-new Firestore run doc; the old run's docs are left exactly as they are
    };
    set(resetState);
    saveSnapshot(resetState, owner);
  },

  resetForOwner: async (owner) => {
    const state = get();
    if (state._owner === owner) return;
    if (state._intervalId) clearInterval(state._intervalId);
    if (state._historyRefreshIntervalId) clearInterval(state._historyRefreshIntervalId);

    set({
      _owner: owner,
      _hasInitialized: true,
      running: false,
      _intervalId: null,
      _historyRefreshIntervalId: null,
      loadingRun: true,
    });

    let restored: Awaited<ReturnType<typeof getLatestRun>> = null;
    if (owner !== 'guest') {
      try {
        restored = await getLatestRun(owner);
      } catch {
        restored = null; // offline, or rules not deployed yet — fall back to localStorage below
      }
    }

    // Another resetForOwner (a fast logout/login, or switching accounts
    // again) may have already moved on while that Firestore read was in
    // flight — don't clobber whatever it set.
    if (get()._owner !== owner) return;

    if (restored) {
      set({
        runId: restored.runId,
        generation: restored.state.generation,
        population: restored.state.population.length > 0 ? restored.state.population : initialPopulation(),
        bestEverFitness: restored.state.bestEverFitness,
        bestEverGenome: restored.state.bestEverGenome ?? initialPopulation()[0].genome,
        firstChampionGenome: restored.state.firstChampionGenome,
        lastSignal: restored.state.lastSignal,
        log: restored.state.log,
        history: restored.recentHistory,
        diversity: restored.recentHistory[restored.recentHistory.length - 1]?.diversity ?? 0,
        graveyard: restored.state.graveyard,
        quarantine: restored.state.quarantine,
        repeatsBlockedTotal: restored.state.repeatsBlockedTotal,
        strategiesCreatedTotal: restored.state.strategiesCreatedTotal,
        eliminatedTotal: restored.state.eliminatedTotal,
        quarantinedTotal: restored.state.quarantinedTotal,
        recentGenerations: restored.recentGenerations,
        loadingRun: false,
      });
    } else {
      const snap = loadSnapshot(owner);
      set({
        runId: null,
        generation: snap?.generation ?? 0,
        population: snap?.population ?? initialPopulation(),
        bestEverFitness: snap?.bestEverFitness ?? null,
        bestEverGenome: snap?.bestEverGenome ?? initialPopulation()[0].genome,
        firstChampionGenome: snap?.firstChampionGenome ?? null,
        lastSignal: snap?.lastSignal ?? null,
        log: snap?.log ?? [],
        history: snap?.history ?? [],
        diversity: snap?.history?.[snap.history.length - 1]?.diversity ?? 0,
        graveyard: snap?.graveyard ?? [],
        quarantine: snap?.quarantine ?? [],
        repeatsBlockedTotal: snap?.repeatsBlockedTotal ?? 0,
        strategiesCreatedTotal: snap?.strategiesCreatedTotal ?? snap?.population?.length ?? 0,
        eliminatedTotal: snap?.eliminatedTotal ?? 0,
        quarantinedTotal: snap?.quarantinedTotal ?? 0,
        recentGenerations: snap?.recentGenerations ?? [],
        loadingRun: false,
      });
    }

    get().loadHistory();
  },
}));
