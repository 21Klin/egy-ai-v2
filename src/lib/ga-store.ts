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
  initialPopulation,
  evolveGeneration,
  fetchHistoricalCloses,
  saveSnapshot,
  loadSnapshot,
} from './ga-engine';

const GENERATION_INTERVAL_MS = 45 * 1000; // 45s per generation

type Signal = { action: 'buy' | 'sell' | 'hold'; price: number; time: number };
type LogEntry = { time: number; message: string };

interface GaStoreState {
  running: boolean;
  generation: number;
  population: Individual[];
  bestEverFitness: number;
  bestEverGenome: Genome;
  lastSignal: Signal | null;
  log: LogEntry[];
  closes: number[];
  loadingHistory: boolean;
  historyError: string | null;
  currentPrice: number;
  _intervalId: ReturnType<typeof setInterval> | null;
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
  bestEverFitness: -Infinity,
  bestEverGenome: initialPopulation()[0].genome,
  lastSignal: null,
  log: [],
  closes: [],
  loadingHistory: false,
  historyError: null,
  currentPrice: 0,
  _intervalId: null,
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
      const data = await fetchHistoricalCloses(500);
      set({ closes: data, loadingHistory: false });
    } catch (e: any) {
      set({ historyError: e.message || 'Failed to fetch historical candles from Binance.', loadingHistory: false });
    }
  },

  runOneGeneration: () => {
    const { closes, population, currentPrice, generation, bestEverFitness, bestEverGenome, log } = get();
    if (closes.length < 60) return;

    const pop = population.length > 0 ? population : initialPopulation();
    const { nextPopulation, best, signal } = evolveGeneration(pop, closes, currentPrice);

    const nextGen = generation + 1;
    const isNewBest = best.fitness > bestEverFitness;
    const updatedBestFitness = isNewBest ? best.fitness : bestEverFitness;
    const updatedBestGenome = isNewBest ? best.genome : bestEverGenome;
    const signalWithTime: Signal = { ...signal, time: Date.now() };

    const logEntry: LogEntry = {
      time: Date.now(),
      message: isNewBest
        ? `Gen ${nextGen}: new best fitness ${best.fitness.toFixed(4)} (fast ${best.genome.fastMa}/slow ${best.genome.slowMa})`
        : `Gen ${nextGen}: best fitness ${best.fitness.toFixed(4)}`,
    };
    const nextLog = [logEntry, ...log].slice(0, 30);

    set({
      generation: nextGen,
      population: nextPopulation,
      bestEverFitness: updatedBestFitness,
      bestEverGenome: updatedBestGenome,
      lastSignal: signalWithTime,
      log: nextLog,
    });

    saveSnapshot(
      {
        generation: nextGen,
        population: nextPopulation,
        bestEverFitness: updatedBestFitness,
        bestEverGenome: updatedBestGenome,
        lastSignal: signalWithTime,
        log: nextLog,
      },
      get()._owner
    );
  },

  start: () => {
    if (get()._intervalId) return;
    set({ running: true });
    get().runOneGeneration();
    const id = setInterval(() => get().runOneGeneration(), GENERATION_INTERVAL_MS);
    set({ _intervalId: id });
  },

  stop: () => {
    const id = get()._intervalId;
    if (id) clearInterval(id);
    set({ running: false, _intervalId: null });
  },

  resetForOwner: (owner) => {
    const state = get();
    if (state._owner === owner) return;
    if (state._intervalId) clearInterval(state._intervalId);

    const snap = loadSnapshot(owner);
    set({
      _owner: owner,
      _hasInitialized: true,
      running: false,
      _intervalId: null,
      generation: snap?.generation ?? 0,
      population: snap?.population ?? initialPopulation(),
      bestEverFitness: snap?.bestEverFitness ?? -Infinity,
      bestEverGenome: snap?.bestEverGenome ?? initialPopulation()[0].genome,
      lastSignal: snap?.lastSignal ?? null,
      log: snap?.log ?? [],
    });

    get().loadHistory();
  },
}));
