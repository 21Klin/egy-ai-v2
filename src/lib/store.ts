'use client';

import { create } from 'zustand';

export type Order = [string, string, string?];

export interface Position {
  entryPrice: number;
  direction: 'buy' | 'sell';
  timestamp: number;
  size?: number;
  leverage?: number;
}

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

  position: Position | null;
  pnl: number;

  sparklineData: { time: number; value: number }[];
  depthData: { bids: Order[]; asks: Order[] };
  trades: Trade[];
  botHistory: BotHistoryEntry[];

  usdtBalance: number;
  btcBalance: number;

  klineHistory: Kline[];
  positionSize: number;
  leverage: number;
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

  enterPosition: (dir: 'buy' | 'sell') => void;
  closePosition: () => void;
  updatePnl: () => void;

  buyBtc: (usdAmount?: number) => void;
  sellBtc: (btcAmount?: number) => void;

  setLeverage: (leverage: number) => void;
  setPositionSize: (size: number) => void;

  setInitialKlines: (klines: Kline[]) => void;
  addKline: (k: Kline) => void;
}

export const useStore = create<AppState & AppActions>((set, get) => ({
  price: 0,
  priceChange: 'same',
  volume24h: 0,
  priceChangePercent: 0,
  latency: 0,

  position: null,
  pnl: 0,

  sparklineData: [],
  depthData: { bids: [], asks: [] },
  trades: [],
  botHistory: [],

  usdtBalance: 10000,
  btcBalance: 0,

  klineHistory: [],
  positionSize: 1000,
  leverage: 1,

  setPrice: (price) => {
    const old = get().price;
    set({ price, priceChange: price > old ? 'up' : price < old ? 'down' : 'same' });
    get().updatePnl();
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

  enterPosition: (direction) => {
    const { price, position, positionSize, leverage, usdtBalance } = get();
    if (price <= 0 || position) return;
    const margin = Math.min(Math.max(0, positionSize), usdtBalance);
    if (margin <= 0) return;
    set({
      position: { entryPrice: price, direction, timestamp: Date.now(), size: margin, leverage },
      pnl: 0,
    });
  },

  closePosition: () => {
    const { pnl, position } = get();
    if (!position) return;
    set((state) => ({ position: null, pnl: 0, usdtBalance: state.usdtBalance + pnl }));
  },

  updatePnl: () => {
    const { position, price } = get();
    if (position && position.size && position.entryPrice > 0) {
      const pnl =
        (price - position.entryPrice) *
        (position.direction === 'buy' ? 1 : -1) *
        (position.size / position.entryPrice) *
        (position.leverage ?? 1);
      set({ pnl });
    }
  },

  buyBtc: (usdAmount = 100) => {
    const { price, usdtBalance } = get();
    if (price > 0 && usdtBalance > 0) {
      const amt = Math.min(usdAmount, usdtBalance);
      const btc = amt / price;
      set((state) => ({ usdtBalance: state.usdtBalance - amt, btcBalance: state.btcBalance + btc }));
    }
  },

  sellBtc: (btcAmount) => {
    const { price, btcBalance } = get();
    if (price > 0 && btcBalance > 0) {
      const amt = btcAmount ? Math.min(btcAmount, btcBalance) : btcBalance;
      const usd = amt * price;
      set((state) => ({ usdtBalance: state.usdtBalance + usd, btcBalance: state.btcBalance - amt }));
    }
  },

  setLeverage: (leverage) => set({ leverage }),
  setPositionSize: (size) => set((state) => ({ positionSize: Math.min(Math.max(size, 0), state.usdtBalance) })),
}));
