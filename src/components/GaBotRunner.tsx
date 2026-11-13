"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useWalletStore } from "@/lib/wallet-store";
import { useGaStore } from "@/lib/ga-store";
import { useAuthStore } from "@/lib/auth-store";
import { useProfileStore } from "@/lib/profile-store";
import { syncPublicProfile } from "@/lib/public-profile";
import { toast } from "@/lib/use-toast";

const DAILY_STOP_LOSS_PCT = 0.08;

/**
 * Mount once near the root (see layout.tsx), independent of which page is
 * open. Turns the GA bot's signals into real paper trades and watches the
 * daily stop-loss.
 *
 * This used to live inside trade-panel.tsx's "GA Bot" tab, which meant the
 * bot only actually traded while that exact tab, on /trading, was open and
 * selected — on /ga-dashboard or /ga-demo the engine (useGaStore, a shared
 * singleton) kept evolving, but nothing ever executed a trade. Moving the
 * execution side here, where it's always mounted, is what makes "the bot"
 * one consistent thing regardless of which page you're looking at.
 *
 * Leader-only: GaBotRunner is mounted in every open tab, but `lastSignal`
 * (and every other field) is mirrored into follower tabs too (see
 * ga-store.ts) so their UI stays live. Without this guard, every open tab
 * would independently execute the SAME signal — double (or triple...)
 * trading one bot decision. Only the tab actually running the engine
 * (the leader) should ever call the wallet.
 */
export default function GaBotRunner() {
  const price = useStore((s) => s.price);
  const buy = useWalletStore((s) => s.buy);
  const sell = useWalletStore((s) => s.sell);
  const btcBalance = useWalletStore((s) => s.btcBalance);
  const usdtBalance = useWalletStore((s) => s.usdtBalance);
  const walletLoading = useWalletStore((s) => s.loading);
  const addBotHistoryEntry = useStore((s) => s.addBotHistoryEntry);

  const isLeader = useGaStore((s) => s.isLeader);
  const running = useGaStore((s) => s.running);
  const stop = useGaStore((s) => s.stop);
  const lastSignal = useGaStore((s) => s.lastSignal);

  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);

  const sessionStartBalanceRef = useRef<number | null>(null);
  const lastActedSignalTimeRef = useRef(0);
  /** Has this tab, as leader, ever looked at a signal yet? Guards against
   *  re-trading a signal it only just INHERITED — either from a page
   *  refresh restoring an already-executed `lastSignal`, or from winning
   *  leadership after a previous leader tab closed. Either way, whatever
   *  signal already exists the moment this tab starts trading was (or will
   *  be) handled by whoever produced it; only a signal that arrives AFTER
   *  should ever place a new trade. */
  const hasSyncedBaselineRef = useRef(false);

  const syncProfile = () => {
    if (user && profile) syncPublicProfile(user.uid, profile);
  };

  // Stop-loss baseline: captured the moment the bot starts running (in
  // THIS tab's lifetime), reset once it stops.
  useEffect(() => {
    if (running) {
      if (sessionStartBalanceRef.current === null) {
        sessionStartBalanceRef.current = usdtBalance + btcBalance * price;
      }
    } else {
      sessionStartBalanceRef.current = null;
    }
  }, [running]);

  useEffect(() => {
    if (!isLeader || !running || sessionStartBalanceRef.current === null) return;
    const currentTotal = usdtBalance + btcBalance * price;
    const loss = (sessionStartBalanceRef.current - currentTotal) / sessionStartBalanceRef.current;
    if (loss >= DAILY_STOP_LOSS_PCT) {
      stop();
      toast({
        title: "Stop-loss triggered",
        description: `Bot paused: portfolio dropped ${(loss * 100).toFixed(1)}% this session.`,
        variant: "destructive",
      });
    }
  }, [usdtBalance, btcBalance, price, running, isLeader, stop]);

  // Execute bot trades — balances + win/loss stats are all handled inside
  // the wallet transaction itself (see wallet-store.ts); this just logs the
  // cosmetic bot-history feed and mirrors the result to the public profile.
  useEffect(() => {
    if (!isLeader) {
      // Reset so the NEXT promotion re-syncs its baseline instead of trading
      // on whatever signal history accumulated while this tab was a
      // follower (which, if anything, some other leader already handled).
      hasSyncedBaselineRef.current = false;
      return;
    }
    if (!hasSyncedBaselineRef.current) {
      hasSyncedBaselineRef.current = true;
      lastActedSignalTimeRef.current = lastSignal?.time ?? 0;
      return; // don't retroactively trade whatever signal we inherited
    }
    if (!lastSignal || lastSignal.time === lastActedSignalTimeRef.current || walletLoading) return;
    lastActedSignalTimeRef.current = lastSignal.time;

    (async () => {
      if (lastSignal.action === "buy") {
        const err = await buy(100, "bot");
        if (err) return;
        addBotHistoryEntry({ time: Date.now(), side: "BUY", price: lastSignal.price, size: 100 / lastSignal.price });
        syncProfile();
      } else if (lastSignal.action === "sell" && btcBalance > 0) {
        const amt = Math.min(100 / lastSignal.price, btcBalance);
        const err = await sell(amt, "bot");
        if (err) return;
        addBotHistoryEntry({ time: Date.now(), side: "SELL", price: lastSignal.price, size: amt });
        syncProfile();
      }
    })();
  }, [lastSignal, buy, sell, btcBalance, walletLoading, addBotHistoryEntry, isLeader]);

  return null;
}
