"use client";

/**
 * WALLET STORE
 * ------------------------------------------------------------------
 * The single source of truth for paper-trading balances shown across
 * the app. For a logged-in account it mirrors users/{uid}/wallet/main
 * in Firestore (via a live onSnapshot subscription) and every trade
 * goes through a Firestore transaction in wallet.ts. For a logged-out
 * visitor it holds a guest wallet in memory only, starting at $10,000
 * and never written to Firestore.
 *
 * SessionController decides which mode applies (loadForUser vs
 * loadGuest) based on Firebase auth state, and calls clear()/loadGuest()
 * on logout so one account's balance can never leak into another's.
 */

import { create } from "zustand";
import { useStore } from "./store";
import {
  type Wallet,
  type WalletPosition,
  type TradeSource,
  defaultWallet,
  applyBuy,
  applySell,
  applyOpenPosition,
  applyClosePosition,
  applyReset,
  ensureWalletLoaded,
  subscribeWallet,
  buyBtcTx,
  sellBtcTx,
  openPositionTx,
  closePositionTx,
  resetWalletTx,
} from "./wallet";

export { computePositionPnl } from "./wallet";
export type { Wallet, WalletPosition };

interface WalletStoreState extends Wallet {
  uid: string | null;
  isGuest: boolean;
  loading: boolean;
  error: string | null;
  _unsub: (() => void) | null;
  _loadToken: symbol | null;

  loadForUser: (uid: string) => Promise<void>;
  loadGuest: () => void;
  clear: () => void;

  buy: (usdAmount: number, source?: TradeSource) => Promise<string | null>;
  sell: (btcAmount: number, source?: TradeSource) => Promise<string | null>;
  openPosition: (direction: "buy" | "sell", size: number, leverage: number, source?: TradeSource) => Promise<string | null>;
  closePosition: (source?: TradeSource) => Promise<string | null>;
  resetWallet: () => Promise<string | null>;
}

function livePrice(): number {
  return useStore.getState().price;
}

export const useWalletStore = create<WalletStoreState>((set, get) => ({
  ...defaultWallet(),
  uid: null,
  isGuest: false,
  loading: true,
  error: null,
  _unsub: null,
  _loadToken: null,

  loadForUser: async (uid) => {
    get()._unsub?.();
    const token = Symbol();
    set({ ...defaultWallet(), uid, isGuest: false, loading: true, error: null, _unsub: null, _loadToken: token });
    try {
      await ensureWalletLoaded(uid);
      if (get()._loadToken !== token) return; // a newer load/logout superseded this one
      const unsub = subscribeWallet(
        uid,
        (wallet) => {
          if (get()._loadToken !== token) return;
          set({ ...wallet, uid, isGuest: false, loading: false, error: null });
        },
        (err) => {
          if (get()._loadToken !== token) return;
          set({ loading: false, error: err.message || "Failed to sync wallet." });
        }
      );
      if (get()._loadToken !== token) {
        unsub();
        return;
      }
      set({ _unsub: unsub });
    } catch (e: any) {
      if (get()._loadToken !== token) return;
      set({ loading: false, error: e?.message || "Failed to load wallet." });
    }
  },

  loadGuest: () => {
    get()._unsub?.();
    set({ ...defaultWallet(), uid: null, isGuest: true, loading: false, error: null, _unsub: null, _loadToken: Symbol() });
  },

  clear: () => get().loadGuest(),

  buy: async (usdAmount, source = "manual") => {
    const { uid, isGuest } = get();
    const price = livePrice();
    try {
      if (!uid || isGuest) {
        const { next } = applyBuy(get(), usdAmount, price, source);
        set({ ...next, error: null });
      } else {
        const next = await buyBtcTx(uid, usdAmount, price, source);
        set({ ...next, error: null });
      }
      return null;
    } catch (e: any) {
      const msg = e?.message || "Trade failed.";
      set({ error: msg });
      return msg;
    }
  },

  sell: async (btcAmount, source = "manual") => {
    const { uid, isGuest } = get();
    const price = livePrice();
    try {
      if (!uid || isGuest) {
        const { next } = applySell(get(), btcAmount, price, source);
        set({ ...next, error: null });
      } else {
        const next = await sellBtcTx(uid, btcAmount, price, source);
        set({ ...next, error: null });
      }
      return null;
    } catch (e: any) {
      const msg = e?.message || "Trade failed.";
      set({ error: msg });
      return msg;
    }
  },

  openPosition: async (direction, size, leverage, source = "leverage") => {
    const { uid, isGuest } = get();
    const price = livePrice();
    try {
      if (!uid || isGuest) {
        const { next } = applyOpenPosition(get(), direction, size, leverage, price, source);
        set({ ...next, error: null });
      } else {
        const next = await openPositionTx(uid, direction, size, leverage, price, source);
        set({ ...next, error: null });
      }
      return null;
    } catch (e: any) {
      const msg = e?.message || "Trade failed.";
      set({ error: msg });
      return msg;
    }
  },

  closePosition: async (source = "leverage") => {
    const { uid, isGuest } = get();
    const price = livePrice();
    try {
      if (!uid || isGuest) {
        const { next } = applyClosePosition(get(), price, source);
        set({ ...next, error: null });
      } else {
        const next = await closePositionTx(uid, price, source);
        set({ ...next, error: null });
      }
      return null;
    } catch (e: any) {
      const msg = e?.message || "Trade failed.";
      set({ error: msg });
      return msg;
    }
  },

  resetWallet: async () => {
    const { uid, isGuest } = get();
    try {
      if (!uid || isGuest) {
        const { next } = applyReset();
        set({ ...next, error: null });
      } else {
        const next = await resetWalletTx(uid, "system");
        set({ ...next, error: null });
      }
      return null;
    } catch (e: any) {
      const msg = e?.message || "Reset failed.";
      set({ error: msg });
      return msg;
    }
  },
}));
