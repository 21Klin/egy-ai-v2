'use client';

/**
 * EQUITY CURVE TRACKER
 * ------------------------------------------------------------
 * Small, separate Zustand store that records portfolio value
 * over time so History can render a real P&L equity curve.
 * Kept deliberately separate from the main store.ts (GA engine,
 * balances, positions) so it doesn't risk touching any of that
 * working logic — it only READS values you already compute.
 */

import { create } from 'zustand';

export type EquityPoint = { time: number; value: number };

interface EquityState {
  points: EquityPoint[];
  record: (value: number) => void;
  reset: () => void;
}

const MAX_POINTS = 500;

export const useEquityStore = create<EquityState>((set) => ({
  points: [],
  record: (value) =>
    set((state) => {
      const last = state.points[state.points.length - 1];
      // avoid spamming identical/near-identical points every render
      if (last && Math.abs(last.value - value) < 0.01 && Date.now() - last.time < 4000) {
        return state;
      }
      const next = [...state.points, { time: Date.now(), value }];
      if (next.length > MAX_POINTS) next.shift();
      return { points: next };
    }),
  reset: () => set({ points: [] }),
}));
