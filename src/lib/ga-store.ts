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

const GENERATION_INTERVAL_MS = 45 * 1000; // 45s per generation
const HISTORY_REFRESH_INTERVAL_MS = 2 * 60 * 1000; // re-fetch fresh candles every 2 minutes while running
const MAX_HISTORY_ENTRIES = 300;
// Every genome needs MAX_POSSIBLE_SLOW_MA+5 warm-up bars, and that requirement
// applies independently to both the train slice AND the test slice.
const MIN_CLOSES_FOR_GENERATION = Math.ceil((MAX_POSSIBLE_SLOW_MA + 5) / (1 - TRAIN_RATIO));

type Signal = { action: 'buy' | 'sell' | 'hold'; price: number; time: number };
type LogEntry = { time: number; message: string };

interface GaStoreState {
  running: boolean;
  generation: number;
  population: Individual[];
  bestEverFitness: number | null;
  bestEverGenome: Genome;
  lastSignal: Signal | null;
  log: LogEntry[];
  history: GenerationHistoryEntry[];
  diversity: number;
  graveyard: GraveyardEntry[];
  quarantine: GraveyardEntry[];
  repeatsBlockedTotal: number;
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
  /** Switches the bot to a different account's isolated state (stops it, clears in-memory population/log, loads that account's own snapshot). "guest" for logged-out visitors. */
  resetForOwner: (owner: string) => void;
}

export const useGaStore = create<GaStoreState>((set, get) => ({
  running: false,
  generation: 0,
  population: [],
  bestEverFitness: null,
  bestEverGenome: initialPopulation()[0].genome,
  lastSignal: null,
  log: [],
  history: [],
  diversity: 0,
  graveyard: [],
  quarantine: [],
  repeatsBlockedTotal: 0,
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
        lastSignal: snap.lastSignal,
        log: snap.log,
        history: snap.history ?? [],
        diversity: snap.history?.[snap.history.length - 1]?.diversity ?? 0,
        graveyard: snap.graveyard ?? [],
        quarantine: snap.quarantine ?? [],
        repeatsBlockedTotal: snap.repeatsBlockedTotal ?? 0,
      });
    } else {
      set({ population: initialPopulation() });
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
      const data = await fetchHistoricalCloses(1000);
      set({ closes: data, loadingHistory: false });
    } catch (e: any) {
      set({ historyError: e.message || 'Failed to fetch historical candles from Binance.', loadingHistory: false });
    }
  },

  runOneGeneration: () => {
    const { closes, population, currentPrice, generation, bestEverFitness, bestEverGenome, log, history, graveyard, quarantine, repeatsBlockedTotal } = get();
    if (closes.length < MIN_CLOSES_FOR_GENERATION) return;

    const { train, test } = splitTrainTest(closes);
    const pop = population.length > 0 ? population : initialPopulation();
    const { nextPopulation, best, signal, historyEntry, graveyard: nextGraveyard, quarantine: nextQuarantine, blockedEvents } = evolveGeneration(
      pop,
      train,
      test,
      currentPrice,
      generation,
      graveyard,
      quarantine
    );

    const isNewBest = bestEverFitness === null || best.fitness > bestEverFitness;
    const updatedBestFitness = isNewBest ? best.fitness : bestEverFitness;
    const updatedBestGenome = isNewBest ? best.genome : bestEverGenome;
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

    set({
      generation: historyEntry.generation,
      population: nextPopulation,
      bestEverFitness: updatedBestFitness,
      bestEverGenome: updatedBestGenome,
      lastSignal: signalWithTime,
      log: nextLog,
      history: nextHistory,
      diversity: historyEntry.diversity,
      graveyard: nextGraveyard,
      quarantine: nextQuarantine,
      repeatsBlockedTotal: nextRepeatsBlockedTotal,
    });

    saveSnapshot(
      {
        generation: historyEntry.generation,
        population: nextPopulation,
        bestEverFitness: updatedBestFitness,
        bestEverGenome: updatedBestGenome,
        lastSignal: signalWithTime,
        log: nextLog,
        history: nextHistory,
        graveyard: nextGraveyard,
        quarantine: nextQuarantine,
        repeatsBlockedTotal: nextRepeatsBlockedTotal,
      },
      get()._owner
    );
  },

  start: () => {
    if (get()._intervalId) return;
    set({ running: true });
    get().runOneGeneration();
    const id = setInterval(() => get().runOneGeneration(), GENERATION_INTERVAL_MS);
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

  resetForOwner: (owner) => {
    const state = get();
    if (state._owner === owner) return;
    if (state._intervalId) clearInterval(state._intervalId);
    if (state._historyRefreshIntervalId) clearInterval(state._historyRefreshIntervalId);

    const snap = loadSnapshot(owner);
    set({
      _owner: owner,
      _hasInitialized: true,
      running: false,
      _intervalId: null,
      _historyRefreshIntervalId: null,
      generation: snap?.generation ?? 0,
      population: snap?.population ?? initialPopulation(),
      bestEverFitness: snap?.bestEverFitness ?? null,
      bestEverGenome: snap?.bestEverGenome ?? initialPopulation()[0].genome,
      lastSignal: snap?.lastSignal ?? null,
      log: snap?.log ?? [],
      history: snap?.history ?? [],
      diversity: snap?.history?.[snap.history.length - 1]?.diversity ?? 0,
      graveyard: snap?.graveyard ?? [],
      quarantine: snap?.quarantine ?? [],
      repeatsBlockedTotal: snap?.repeatsBlockedTotal ?? 0,
    });

    get().loadHistory();
  },
}));
