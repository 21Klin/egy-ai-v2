/**
 * PAPER WALLET — Firestore-backed source of truth.
 * ------------------------------------------------------------------
 * Every account gets exactly $10,000 USDT once, stored at
 * users/{uid}/wallet/main. Every trade (manual, leverage, bot) is
 * applied through a Firestore transaction (read -> validate -> write
 * balances + append an audit row to users/{uid}/trades), so two tabs
 * or devices can never race each other into a wrong balance.
 *
 * The "apply*" functions below are pure (no Firestore) so the exact
 * same math can run for a logged-in account (wrapped in a transaction)
 * and for a logged-out guest (applied directly to in-memory state in
 * wallet-store.ts) without duplicating the trading rules.
 */

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firestore";

export const STARTING_BALANCE = 10000;
export const FEE_RATE = 0.001; // 0.10%, matches Binance taker fee used by the GA engine

export interface WalletPosition {
  direction: "buy" | "sell";
  entryPrice: number;
  size: number; // margin in USDT
  leverage: number;
  timestamp: number;
}

export interface Wallet {
  usdtBalance: number;
  btcBalance: number;
  position: WalletPosition | null;
  realizedPnl: number;
  createdAt: number;
  updatedAt: number;
}

export type TradeSource = "manual" | "leverage" | "bot" | "system";
export type TradeSide = "buy" | "sell" | "open_long" | "open_short" | "close" | "reset";

export interface TradeRecord {
  time: number;
  side: TradeSide;
  price: number;
  amount: number;
  fee: number;
  balanceAfter: number;
  pnl?: number;
}

export interface StoredTradeRecord extends TradeRecord {
  source: TradeSource;
}

export function defaultWallet(): Wallet {
  const now = Date.now();
  return { usdtBalance: STARTING_BALANCE, btcBalance: 0, position: null, realizedPnl: 0, createdAt: now, updatedAt: now };
}

export function normalizeWallet(data: any): Wallet {
  return {
    usdtBalance: typeof data?.usdtBalance === "number" ? data.usdtBalance : STARTING_BALANCE,
    btcBalance: typeof data?.btcBalance === "number" ? data.btcBalance : 0,
    position: data?.position ?? null,
    realizedPnl: typeof data?.realizedPnl === "number" ? data.realizedPnl : 0,
    createdAt: typeof data?.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt: typeof data?.updatedAt === "number" ? data.updatedAt : Date.now(),
  };
}

export function computePositionPnl(position: WalletPosition | null, price: number): number {
  if (!position || position.entryPrice <= 0 || price <= 0) return 0;
  return (
    (price - position.entryPrice) *
    (position.direction === "buy" ? 1 : -1) *
    (position.size / position.entryPrice) *
    (position.leverage || 1)
  );
}

// ── Pure trade math (shared by guest mode and Firestore transactions) ──────

export function applyBuy(wallet: Wallet, usdAmount: number, price: number): { next: Wallet; trade: TradeRecord } {
  if (price <= 0) throw new Error("No live price yet — try again in a moment.");
  if (usdAmount <= 0) throw new Error("Enter an amount greater than zero.");
  if (wallet.usdtBalance <= 0) throw new Error("Insufficient USDT balance.");
  const amt = Math.min(usdAmount, wallet.usdtBalance);
  const fee = amt * FEE_RATE;
  const btc = (amt - fee) / price;
  const next: Wallet = { ...wallet, usdtBalance: wallet.usdtBalance - amt, btcBalance: wallet.btcBalance + btc, updatedAt: Date.now() };
  return { next, trade: { time: Date.now(), side: "buy", price, amount: btc, fee, balanceAfter: next.usdtBalance } };
}

export function applySell(wallet: Wallet, btcAmount: number, price: number): { next: Wallet; trade: TradeRecord } {
  if (price <= 0) throw new Error("No live price yet — try again in a moment.");
  if (wallet.btcBalance <= 0) throw new Error("No BTC to sell.");
  const amt = btcAmount > 0 ? Math.min(btcAmount, wallet.btcBalance) : wallet.btcBalance;
  const gross = amt * price;
  const fee = gross * FEE_RATE;
  const next: Wallet = { ...wallet, btcBalance: wallet.btcBalance - amt, usdtBalance: wallet.usdtBalance + gross - fee, updatedAt: Date.now() };
  return { next, trade: { time: Date.now(), side: "sell", price, amount: amt, fee, balanceAfter: next.usdtBalance } };
}

export function applyOpenPosition(
  wallet: Wallet,
  direction: "buy" | "sell",
  size: number,
  leverage: number,
  price: number
): { next: Wallet; trade: TradeRecord } {
  if (price <= 0) throw new Error("No live price yet — try again in a moment.");
  if (wallet.position) throw new Error("A position is already open.");
  const margin = Math.min(Math.max(size, 0), wallet.usdtBalance);
  if (margin <= 0) throw new Error("Insufficient balance for this position size.");
  const position: WalletPosition = { direction, entryPrice: price, size: margin, leverage: Math.max(1, leverage), timestamp: Date.now() };
  const next: Wallet = { ...wallet, position, updatedAt: Date.now() };
  return {
    next,
    trade: { time: Date.now(), side: direction === "buy" ? "open_long" : "open_short", price, amount: margin, fee: 0, balanceAfter: next.usdtBalance },
  };
}

export function applyClosePosition(wallet: Wallet, price: number): { next: Wallet; trade: TradeRecord } {
  if (!wallet.position) throw new Error("No open position.");
  if (price <= 0) throw new Error("No live price yet — try again in a moment.");
  const pnl = computePositionPnl(wallet.position, price);
  const next: Wallet = { ...wallet, usdtBalance: wallet.usdtBalance + pnl, position: null, realizedPnl: wallet.realizedPnl + pnl, updatedAt: Date.now() };
  return { next, trade: { time: Date.now(), side: "close", price, amount: wallet.position.size, fee: 0, balanceAfter: next.usdtBalance, pnl } };
}

export function applyReset(): { next: Wallet; trade: TradeRecord } {
  const next = defaultWallet();
  return { next, trade: { time: Date.now(), side: "reset", price: 0, amount: 0, fee: 0, balanceAfter: next.usdtBalance } };
}

// ── Firestore-backed persistence ────────────────────────────────────────────

function walletDocRef(uid: string) {
  return doc(db, "users", uid, "wallet", "main");
}

function tradesColRef(uid: string) {
  return collection(db, "users", uid, "trades");
}

/** Reads the wallet, creating it with exactly $10,000 if this account has never had one. Idempotent. */
export async function ensureWalletLoaded(uid: string): Promise<Wallet> {
  const ref = walletDocRef(uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return normalizeWallet(snap.data());
    const fresh = defaultWallet();
    tx.set(ref, fresh);
    return fresh;
  });
}

/** Live-syncs the wallet doc so balances stay correct across tabs/devices. */
export function subscribeWallet(uid: string, onChange: (wallet: Wallet) => void, onError: (err: Error) => void): Unsubscribe {
  const ref = walletDocRef(uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) onChange(normalizeWallet(snap.data()));
    },
    onError
  );
}

async function runWalletTx(
  uid: string,
  mutate: (wallet: Wallet) => { next: Wallet; trade: TradeRecord },
  source: TradeSource
): Promise<Wallet> {
  const ref = walletDocRef(uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const wallet = snap.exists() ? normalizeWallet(snap.data()) : defaultWallet();
    const { next, trade } = mutate(wallet);
    tx.set(ref, next);
    const tradeRef = doc(tradesColRef(uid));
    const record: StoredTradeRecord = { ...trade, source };
    tx.set(tradeRef, record);
    return next;
  });
}

export function buyBtcTx(uid: string, usdAmount: number, price: number, source: TradeSource) {
  return runWalletTx(uid, (w) => applyBuy(w, usdAmount, price), source);
}

export function sellBtcTx(uid: string, btcAmount: number, price: number, source: TradeSource) {
  return runWalletTx(uid, (w) => applySell(w, btcAmount, price), source);
}

export function openPositionTx(uid: string, direction: "buy" | "sell", size: number, leverage: number, price: number, source: TradeSource) {
  return runWalletTx(uid, (w) => applyOpenPosition(w, direction, size, leverage, price), source);
}

export function closePositionTx(uid: string, price: number, source: TradeSource) {
  return runWalletTx(uid, (w) => applyClosePosition(w, price), source);
}

export function resetWalletTx(uid: string, source: TradeSource = "system") {
  return runWalletTx(uid, () => applyReset(), source);
}
