'use client';

import { create } from 'zustand';

export type Order = [string, string, string?];

export interface Trade {
  price: number;
  quantity: number;
  time: number;
  isMaker: boolean;
}

export interface BotHistoryEntry {
  id: number;
  time: number;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
}

export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinal: boolean;
}

interface AppState {
  price: number;
  priceChange: 'up' | 'down' | 'same';

  volume24h: number;
  priceChangePercent: number;
  latency: number;

  sparklineData: { time: number; value: number }[];
  depthData: { bids: Order[]; asks: Order[] };
  trades: Trade[];
  botHistory: BotHistoryEntry[];

  klineHistory: Kline[];
}

interface AppActions {
  setPrice: (price: number) => void;
  setVolume24h: (v: number) => void;
  setPriceChangePercent: (v: number) => void;
  setLatency: (v: number) => void;

  setDepthData: (d: { bids: Order[]; asks: Order[] }) => void;
  setSparklineData: (d: { time: number; value: number }) => void;
  addTrade: (t: Trade) => void;

  addBotHistoryEntry: (entry: { time: number; side: 'BUY' | 'SELL'; price: number; size: number }) => void;
  clearBotHistory: () => void;

  setInitialKlines: (klines: Kline[]) => void;
  addKline: (k: Kline) => void;
}

export const useStore = create<AppState & AppActions>((set, get) => ({
  price: 0,
  priceChange: 'same',
  volume24h: 0,
  priceChangePercent: 0,
  latency: 0,

  sparklineData: [],
  depthData: { bids: [], asks: [] },
  trades: [],
  botHistory: [],

  klineHistory: [],

  setPrice: (price) => {
    const old = get().price;
    set({ price, priceChange: price > old ? 'up' : price < old ? 'down' : 'same' });
  },

  setVolume24h: (v) => set({ volume24h: v }),
  setPriceChangePercent: (v) => set({ priceChangePercent: v }),
  setLatency: (v) => set({ latency: v }),

  setDepthData: (d) => set({ depthData: d }),

  setSparklineData: (d) =>
    set((state) => {
      const arr = [...state.sparklineData, d];
      if (arr.length > 100) arr.shift();
      return { sparklineData: arr };
    }),

  setInitialKlines: (kl) => set({ klineHistory: kl }),

  addKline: (k) =>
    set((state) => {
      const hist = [...state.klineHistory];
      const last = hist[hist.length - 1];
      if (last && last.time === k.time) hist[hist.length - 1] = k;
      else hist.push(k);
      if (hist.length > 1000) hist.shift();
      return { klineHistory: hist };
    }),

  addTrade: (trade) =>
    set((state) => {
      const arr = [trade, ...state.trades];
      if (arr.length > 50) arr.pop();
      return { trades: arr };
    }),

  addBotHistoryEntry: (entry) =>
    set((state) => {
      const nextId = state.botHistory.length > 0 ? state.botHistory[0].id + 1 : 1;
      const newEntry: BotHistoryEntry = { id: nextId, ...entry };
      const arr = [newEntry, ...state.botHistory];
      if (arr.length > 100) arr.pop();
      return { botHistory: arr };
    }),

  clearBotHistory: () => set({ botHistory: [] }),
}));
