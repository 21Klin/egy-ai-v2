"use client";

import { useStore } from "@/lib/store";
import { useWalletStore, computePositionPnl } from "@/lib/wallet-store";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Switch } from "./ui/switch";
import { useEffect, useState, useRef } from "react";
import { toast } from "@/lib/use-toast";
import { Input } from "./ui/input";
import { useGaStore } from "@/lib/ga-store";
import { useAuthStore } from "@/lib/auth-store";
import { useProfileStore } from "@/lib/profile-store";
import { syncPublicProfile } from "@/lib/public-profile";
import Link from "next/link";

const DAILY_STOP_LOSS_PCT = 0.08;

/** After a trade completes, mirror the toggled-on stats out to the public profile (no-op for guests / logged-out). */
function useSyncPublicProfileAfterTrade() {
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  return () => {
    if (user && profile) syncPublicProfile(user.uid, profile);
  };
}

// ── RESET WALLET ─────────────────────────────────────────────────────────────

function ResetWalletButton() {
  const resetWallet = useWalletStore((s) => s.resetWallet);
  const loading = useWalletStore((s) => s.loading);
  const [confirming, setConfirming] = useState(false);

  const handleReset = async () => {
    const err = await resetWallet();
    setConfirming(false);
    if (err) {
      toast({ title: "Reset failed", description: err, variant: "destructive" });
    } else {
      toast.success("Paper account reset to $10,000.");
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
        <span>Reset balance to $10,000? This can&apos;t be undone.</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 border-slate-700 px-2 text-[11px]" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button size="sm" className="h-7 bg-red-500/20 px-2 text-[11px] text-red-200 hover:bg-red-500/30" onClick={handleReset}>
            Confirm
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      disabled={loading}
      onClick={() => setConfirming(true)}
      className="font-data text-[11px] text-slate-500 underline-offset-2 hover:text-red-300 hover:underline disabled:opacity-40"
    >
      Reset paper account to $10,000
    </button>
  );
}

// ── WALLET ───────────────────────────────────────────────────────────────────

function Wallet() {
  const usdtBalance = useWalletStore((s) => s.usdtBalance);
  const btcBalance = useWalletStore((s) => s.btcBalance);
  const position = useWalletStore((s) => s.position);
  const loading = useWalletStore((s) => s.loading);
  const isGuest = useWalletStore((s) => s.isGuest);
  const error = useWalletStore((s) => s.error);
  const price = useStore((s) => s.price);

  const pnl = computePositionPnl(position, price);
  const btcValueInUsdt = btcBalance * price;
  const totalValue = usdtBalance + btcValueInUsdt + (position ? pnl : 0);
  const marginUsed = position ? position.size ?? 0 : 0;
  const leverageBtc =
    position && position.entryPrice > 0
      ? ((position.size ?? 0) / position.entryPrice) *
        (position.leverage ?? 1) *
        (position.direction === "buy" ? 1 : -1)
      : 0;

  if (loading) {
    return (
      <div className="space-y-3 pt-1">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-800/70" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-800/70" />
        <p className="font-data text-[11px] text-slate-500">Loading your paper wallet…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-1">
      {isGuest && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Guest mode: your trades won&apos;t be saved.{" "}
          <Link href="/login" className="underline underline-offset-2 hover:text-amber-100">
            Log in
          </Link>{" "}
          to keep your progress.
        </div>
      )}
      {error && !isGuest && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          Wallet sync issue: {error} Numbers below may be out of date until this clears.
        </div>
      )}
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground">Total Value</span>
        <span className="font-data text-xl font-bold text-emerald-300">
          ${totalValue.toFixed(2)}
        </span>
      </div>
      <div className="space-y-2 text-sm divide-y divide-slate-800/60 pt-1">
        <div className="pt-2" />
        <div className="flex justify-between">
          <span className="text-muted-foreground">USDT (cash)</span>
          <span className="font-data text-emerald-400">{usdtBalance.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">BTC (spot)</span>
          <span className="font-data text-orange-400">{btcBalance.toFixed(6)}</span>
        </div>
        {position && (
          <>
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">Margin in position</span>
              <span className="font-data">{marginUsed.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">BTC exposure</span>
              <span className="font-data text-orange-400 font-semibold">
                {Math.abs(leverageBtc).toFixed(6)}{" "}
                {leverageBtc > 0 ? "long" : leverageBtc < 0 ? "short" : ""}
              </span>
            </div>
          </>
        )}
      </div>
      <ResetWalletButton />
    </div>
  );
}

// ── SPOT TRADING ─────────────────────────────────────────────────────────────

function SpotTrading() {
  const buy = useWalletStore((s) => s.buy);
  const sell = useWalletStore((s) => s.sell);
  const btcBalance = useWalletStore((s) => s.btcBalance);
  const usdtBalance = useWalletStore((s) => s.usdtBalance);
  const walletLoading = useWalletStore((s) => s.loading);
  const price = useStore((s) => s.price);
  const [amountUsd, setAmountUsd] = useState(100);
  const syncProfile = useSyncPublicProfileAfterTrade();
  const canBuy = !walletLoading && price > 0 && usdtBalance > 0 && amountUsd > 0;

  const handleBuy = async () => {
    if (!canBuy) return;
    const err = await buy(amountUsd, "manual");
    if (err) {
      toast({ title: "Trade failed", description: err, variant: "destructive" });
      return;
    }
    syncProfile();
  };

  const handleSell = async () => {
    if (btcBalance <= 0 || walletLoading) return;
    const err = await sell(btcBalance, "manual");
    if (err) {
      toast({ title: "Trade failed", description: err, variant: "destructive" });
      return;
    }
    syncProfile();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="spot-amount">Amount (USDT)</Label>
        <Input
          id="spot-amount"
          type="number"
          min={1}
          step={10}
          value={amountUsd}
          onChange={(e) => setAmountUsd(Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value))}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[25, 50, 100].map((v) => (
          <Button key={v} variant="outline" onClick={() => setAmountUsd(v)}
            className="border-slate-700 bg-slate-900/40 hover:bg-slate-900/70">
            {v} USDT
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Button
          className="h-12 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
          disabled={!canBuy}
          onClick={handleBuy}
        >
          BUY ({amountUsd || 0} USDT)
        </Button>
        <Button
          className="h-12 bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
          onClick={handleSell}
          disabled={btcBalance <= 0 || walletLoading}
        >
          SELL (ALL)
        </Button>
      </div>
    </div>
  );
}

// ── LEVERAGE TRADING ─────────────────────────────────────────────────────────

function LeverageTrading() {
  const position = useWalletStore((s) => s.position);
  const usdtBalance = useWalletStore((s) => s.usdtBalance);
  const walletLoading = useWalletStore((s) => s.loading);
  const openPosition = useWalletStore((s) => s.openPosition);
  const closePosition = useWalletStore((s) => s.closePosition);
  const price = useStore((s) => s.price);
  const pnl = computePositionPnl(position, price);

  const [leverage, setLeverage] = useState(1);
  const [positionSizeInput, setPositionSizeInput] = useState(1000);
  const positionSize = Math.min(Math.max(positionSizeInput, 0), usdtBalance);

  const syncProfile = useSyncPublicProfileAfterTrade();
  const leverageOptions = [1, 2, 4, 8];

  const handleEnter = async (dir: "buy" | "sell") => {
    if (walletLoading) return;
    const err = await openPosition(dir, positionSize, leverage, "leverage");
    if (err) {
      toast({ title: "Trade failed", description: err, variant: "destructive" });
      return;
    }
    syncProfile();
  };

  const handleClose = async () => {
    if (!position || walletLoading) return;
    const err = await closePosition("leverage");
    if (err) {
      toast({ title: "Close failed", description: err, variant: "destructive" });
      return;
    }
    syncProfile();
  };

  if (position) {
    const pnlPercentage = ((pnl / (position.size || 1)) * 100 * (position.leverage || 1)) || 0;
    const isProfit = pnl >= 0;
    return (
      <div className="space-y-5 pt-1">
        <div className="grid grid-cols-3 gap-4 text-center bg-slate-900/40 p-3 rounded-xl border border-slate-800">
          <div>
            <div className="text-sm text-muted-foreground">Direction</div>
            <div className={cn("text-lg font-bold uppercase", position.direction === "buy" ? "text-success" : "text-destructive")}>
              {position.direction}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Leverage</div>
            <div className="font-data text-lg font-bold">{position.leverage}x</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Entry Price</div>
            <div className="font-data text-lg font-bold">${position.entryPrice.toFixed(2)}</div>
          </div>
        </div>
        <div className="space-y-2 text-center bg-slate-900/40 p-3 rounded-xl border border-slate-800">
          <div className="text-sm text-muted-foreground">Live P&L</div>
          <div className={cn("font-data text-3xl font-bold", isProfit ? "text-success" : "text-destructive")}>
            {isProfit ? "+" : ""}${pnl.toFixed(2)} ({isProfit ? "+" : ""}{pnlPercentage.toFixed(2)}%)
          </div>
          <div className="text-xs text-muted-foreground">
            Opened {formatDistanceToNow(position.timestamp, { addSuffix: true })}
          </div>
        </div>
        <Button
          className="w-full h-11 bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
          onClick={handleClose}
          disabled={walletLoading}
        >
          Close Position
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-1">
      <div className="space-y-2">
        <Label>Leverage</Label>
        <RadioGroup
          value={leverage.toString()}
          onValueChange={(v) => setLeverage(Number(v))}
          className="flex gap-4 bg-slate-900/40 border border-slate-800 p-3 rounded-xl"
        >
          {leverageOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <RadioGroupItem value={option.toString()} id={`r${option}`} />
              <Label htmlFor={`r${option}`} className="font-normal">{option}x</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      <div className="space-y-2">
        <Label htmlFor="lev-size">Position size (USDT)</Label>
        <Input
          id="lev-size"
          type="number"
          min={10}
          step={10}
          value={positionSizeInput}
          onChange={(e) => setPositionSizeInput(Number(e.target.value) || 0)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <Button className="h-12 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
          onClick={() => handleEnter("buy")} disabled={walletLoading}>Long</Button>
        <Button className="h-12 bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
          onClick={() => handleEnter("sell")} disabled={walletLoading}>Short</Button>
      </div>
    </div>
  );
}

// ── GA BOT ───────────────────────────────────────────────────────────────────

function GeneticAlgorithmTrader() {
  const price = useStore((s) => s.price);
  const buy = useWalletStore((s) => s.buy);
  const sell = useWalletStore((s) => s.sell);
  const btcBalance = useWalletStore((s) => s.btcBalance);
  const usdtBalance = useWalletStore((s) => s.usdtBalance);
  const walletLoading = useWalletStore((s) => s.loading);
  const addBotHistoryEntry = useStore((s) => s.addBotHistoryEntry);

  const init = useGaStore((s) => s.init);
  const setCurrentPrice = useGaStore((s) => s.setCurrentPrice);
  const running = useGaStore((s) => s.running);
  const start = useGaStore((s) => s.start);
  const stop = useGaStore((s) => s.stop);
  const generation = useGaStore((s) => s.generation);
  const bestEverFitness = useGaStore((s) => s.bestEverFitness);
  const lastSignal = useGaStore((s) => s.lastSignal);
  const loadingHistory = useGaStore((s) => s.loadingHistory);
  const historyError = useGaStore((s) => s.historyError);

  const syncProfile = useSyncPublicProfileAfterTrade();
  const sessionStartBalanceRef = useRef<number | null>(null);
  const [stopLossTriggered, setStopLossTriggered] = useState(false);
  const lastActedSignalTimeRef = useRef(0);
  const lastGenerationRef = useRef(0);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { if (price > 0) setCurrentPrice(price); }, [price, setCurrentPrice]);

  // Mirror generation/best-fitness progress to the public profile whenever it changes.
  // gaGenerations itself isn't persisted anywhere else — this component's own
  // dashboard reads it live from the GA store; only the public profile needs a copy.
  useEffect(() => {
    if (generation > 0 && generation !== lastGenerationRef.current) {
      lastGenerationRef.current = generation;
      syncProfile();
    }
  }, [generation, syncProfile]);

  // Stop-loss
  useEffect(() => {
    if (running) {
      if (sessionStartBalanceRef.current === null) {
        sessionStartBalanceRef.current = usdtBalance + btcBalance * price;
      }
      setStopLossTriggered(false);
    } else {
      sessionStartBalanceRef.current = null;
    }
  }, [running]);

  useEffect(() => {
    if (!running || sessionStartBalanceRef.current === null) return;
    const currentTotal = usdtBalance + btcBalance * price;
    const loss = (sessionStartBalanceRef.current - currentTotal) / sessionStartBalanceRef.current;
    if (loss >= DAILY_STOP_LOSS_PCT) {
      stop();
      setStopLossTriggered(true);
      toast({
        title: "Stop-loss triggered",
        description: `Bot paused: portfolio dropped ${(loss * 100).toFixed(1)}% this session.`,
        variant: "destructive",
      });
    }
  }, [usdtBalance, btcBalance, price, running, stop]);

  // Execute bot trades — balances + win/loss stats are all handled inside the
  // wallet transaction itself (see wallet.ts); this just logs the cosmetic
  // bot-history feed and mirrors the result to the public profile.
  useEffect(() => {
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
  }, [lastSignal, buy, sell, btcBalance, walletLoading, addBotHistoryEntry, syncProfile]);

  const handleToggle = (shouldRun: boolean) => {
    if (shouldRun) {
      setStopLossTriggered(false);
      start();
      toast.success("GA Bot started", { description: "Evolving on real BTC/USDT candles." });
    } else {
      stop();
      toast.info("GA Bot stopped.");
    }
  };

  return (
    <div className="relative space-y-5 bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/5 to-purple-500/5 blur-xl" />
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-slate-100">Genetic Algorithm Bot</h3>
          <p className={cn("font-data text-xs", running ? "text-emerald-300" : stopLossTriggered ? "text-red-300" : "text-slate-500")}>
            {running ? "● EVOLVING" : stopLossTriggered ? "● STOP-LOSS TRIGGERED" : "● IDLE"}
          </p>
        </div>
        <Switch checked={running} onCheckedChange={handleToggle} disabled={loadingHistory || walletLoading} aria-label="Toggle GA Bot" />
      </div>

      {historyError && <p className="text-xs text-amber-300">{historyError}</p>}

      {stopLossTriggered && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          <strong>Stop-loss triggered.</strong> Bot lost more than {DAILY_STOP_LOSS_PCT * 100}% of session-start balance. Toggle to resume.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm bg-slate-900/30 p-3 rounded-lg border border-slate-800">
        <div className="text-slate-400">Generation</div>
        <div className="text-right font-data text-emerald-300">{generation > 0 ? generation : "—"}</div>
        <div className="text-slate-400">Best fitness</div>
        <div className="text-right font-data text-emerald-300">
          {bestEverFitness !== null ? bestEverFitness.toFixed(4) : "—"}
        </div>
        <div className="text-slate-400">Last signal</div>
        <div className="text-right font-data">{lastSignal?.action.toUpperCase() ?? "—"}</div>
        <div className="text-slate-400">Stop-loss</div>
        <div className="text-right font-data text-slate-400">{DAILY_STOP_LOSS_PCT * 100}% limit</div>
      </div>

      <Link href="/ga-dashboard" className="block text-center font-data text-xs text-emerald-300 underline-offset-4 hover:underline">
        Open full GA Dashboard →
      </Link>
    </div>
  );
}

// ── MAIN PANEL ───────────────────────────────────────────────────────────────

export default function TradePanel() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-shrink-0 border-b p-4 bg-slate-950/60">
        <Wallet />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-col space-y-4 p-0">
        <Tabs defaultValue="spot" className="flex min-h-0 flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="spot">Spot</TabsTrigger>
            <TabsTrigger value="leverage">Leverage</TabsTrigger>
            <TabsTrigger value="ga-bot">GA Bot</TabsTrigger>
          </TabsList>
          <TabsContent value="spot" className="p-4"><SpotTrading /></TabsContent>
          <TabsContent value="leverage" className="p-4"><LeverageTrading /></TabsContent>
          <TabsContent value="ga-bot" className="p-4"><GeneticAlgorithmTrader /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
