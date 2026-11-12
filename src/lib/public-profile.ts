"use client";

/**
 * PUBLIC PROFILE MIRROR
 * ------------------------------------------------------------------
 * users/{uid} (the private profile doc) holds the account's email
 * and settings, and is readable only by its owner. The public
 * profile page can't read that — instead it reads publicProfiles/{uid},
 * a small doc containing only displayName/createdAt/the two "always
 * shown" badge numbers (generations, best fitness) and whichever
 * stats the owner has toggled on. No email, ever.
 *
 * syncPublicProfile rebuilds this doc from scratch (full overwrite,
 * not a merge) every time it's called, from whatever this browser's
 * live stores (wallet, GA, price) currently hold — so turning a
 * stat's visibility off actually removes it from the public doc
 * instead of leaving stale data behind. It's called right after a
 * trade completes and whenever a visibility toggle or display name
 * changes; it takes the current profile as a parameter rather than
 * importing profile-store itself, to avoid a module import cycle
 * (profile-store calls this file after it writes a toggle change).
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firestore";
import { useStore } from "./store";
import { useWalletStore } from "./wallet-store";
import { computePositionPnl, STARTING_BALANCE, winRatePct } from "./wallet";
import { useGaStore } from "./ga-store";
import type { UserProfile } from "./firestore";

export interface PublicProfile {
  uid: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
  // Always present — feeds the "Bot Advancement" band, independent of
  // the optional stats grid below (matches the page's original layout).
  gaGenerations: number;
  bestFitness: number | null;
  // Only the keys the owner has toggled on appear here at all.
  stats: Partial<{
    manualTrades: number;
    leverageTrades: number;
    botTrades: number;
    gaGenerations: number;
    winRate: number;
    totalPnl: number;
    paperEquity: number;
    botWinRate: number;
    bestFitness: number;
  }>;
}

function publicProfileRef(uid: string) {
  return doc(db, "publicProfiles", uid);
}

export async function readPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snap = await getDoc(publicProfileRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as PublicProfile;
}

type ProfileForSync = Pick<UserProfile, "displayName" | "createdAt" | "show">;

export async function syncPublicProfile(uid: string, profile: ProfileForSync): Promise<void> {
  const wallet = useWalletStore.getState();
  // Only ever publish THIS account's own live state — never another
  // account's (e.g. a sync queued right as the user logs out) and
  // never a guest's (guests have no public profile to sync).
  if (wallet.uid !== uid || wallet.isGuest) return;

  const price = useStore.getState().price;
  const ga = useGaStore.getState();

  const equity = wallet.usdtBalance + wallet.btcBalance * price + (wallet.position ? computePositionPnl(wallet.position, price) : 0);
  const totalPnl = equity - STARTING_BALANCE;
  const overallWinRate = winRatePct(wallet.closedTrades, wallet.wins);
  const botWinRate = winRatePct(wallet.botClosedTrades, wallet.botWins);

  const gaGenerations = ga._owner === uid ? ga.generation : 0;
  const bestFitness = ga._owner === uid && ga.bestEverFitness > -Infinity ? ga.bestEverFitness : null;

  const stats: PublicProfile["stats"] = {};
  if (profile.show.manualTrades) stats.manualTrades = wallet.manualTrades;
  if (profile.show.leverageTrades) stats.leverageTrades = wallet.leverageTrades;
  if (profile.show.botTrades) stats.botTrades = wallet.botTrades;
  if (profile.show.gaGenerations) stats.gaGenerations = gaGenerations;
  if (profile.show.winRate && overallWinRate !== null) stats.winRate = overallWinRate;
  if (profile.show.totalPnl) stats.totalPnl = totalPnl;
  if (profile.show.paperEquity) stats.paperEquity = equity;
  if (profile.show.botWinRate && botWinRate !== null) stats.botWinRate = botWinRate;
  if (profile.show.bestFitness && bestFitness !== null) stats.bestFitness = bestFitness;

  const doc_: PublicProfile = {
    uid,
    displayName: profile.displayName,
    createdAt: profile.createdAt,
    updatedAt: Date.now(),
    gaGenerations,
    bestFitness,
    stats,
  };

  try {
    await setDoc(publicProfileRef(uid), doc_);
  } catch {
    // Non-fatal: the public mirror is a nice-to-have, not the source
    // of truth. A later trade/toggle change will retry the sync.
  }
}
