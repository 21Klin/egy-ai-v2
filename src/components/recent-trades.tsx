"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function RecentTrades() {
  const trades = useStore((s) => s.trades);

  return (
    <div className="font-data text-xs">
      <div className="grid grid-cols-3 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>Price (USDT)</span>
        <span className="text-right">Amount (BTC)</span>
        <span className="text-right">Time</span>
      </div>
      <div className="space-y-px overflow-hidden px-2">
        {trades.map((trade, i) => (
          <div key={i} className={cn("grid grid-cols-3 items-center h-6 rounded-md px-1 transition-colors duration-150 hover:bg-slate-900/60")}>
            <span className={cn(trade.isMaker ? "text-red-400" : "text-emerald-400")}>{trade.price.toFixed(2)}</span>
            <span className="text-right text-slate-200">{trade.quantity.toFixed(4)}</span>
            <span className="text-right text-slate-500">{format(trade.time, "HH:mm:ss")}</span>
          </div>
        ))}
        {trades.length === 0 && <p className="py-4 text-center text-slate-500">Waiting for live trades…</p>}
      </div>
    </div>
  );
}
