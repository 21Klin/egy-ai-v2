"use client";

import { useMemo } from "react";
import { useStore, type Order } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

function OrderBookRow({ order, type, maxCumulative }: { order: Order; type: "bid" | "ask"; maxCumulative: number }) {
  const [price, quantity, cumulative] = order;
  const bgWidth = maxCumulative > 0 ? (Number(cumulative) / maxCumulative) * 100 : 0;

  return (
    <div className="relative grid h-6 grid-cols-2 items-center px-2 text-xs font-data">
      <div
        className={cn("absolute top-0 bottom-0 right-0 h-full rounded-l-md transition-all duration-200", type === "bid" ? "bg-emerald-500/10" : "bg-red-500/10")}
        style={{ width: `${bgWidth}%` }}
      />
      <span className={cn("z-10 text-left", type === "ask" ? "text-red-300" : "text-emerald-300")}>{parseFloat(price).toFixed(2)}</span>
      <span className="z-10 text-right text-slate-200">{parseFloat(quantity).toFixed(4)}</span>
    </div>
  );
}

export default function OrderBook() {
  const depthData = useStore((s) => s.depthData);
  const price = useStore((s) => s.price);
  const priceChange = useStore((s) => s.priceChange);

  const numRows = 8;

  const { processedBids, processedAsks, maxCumulative } = useMemo(() => {
    let cumulativeBids = 0;
    const bids: Order[] = depthData.bids.slice(0, numRows).map(([p, q]) => {
      cumulativeBids += Number(q);
      return [p, q, cumulativeBids.toString()] as Order;
    });

    let cumulativeAsks = 0;
    const asks: Order[] = depthData.asks.slice(0, numRows).map(([p, q]) => {
      cumulativeAsks += Number(q);
      return [p, q, cumulativeAsks.toString()] as Order;
    });

    return { processedBids: bids, processedAsks: asks.reverse(), maxCumulative: Math.max(cumulativeBids, cumulativeAsks) };
  }, [depthData]);

  if (processedAsks.length === 0 || processedBids.length === 0) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 13 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col font-data text-xs">
      <div className="grid grid-cols-2 px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">
        <span>Price (USDT)</span>
        <span className="text-right">Amount (BTC)</span>
      </div>
      <div className="flex-1 space-y-px overflow-hidden">
        {processedAsks.map((o, i) => (
          <OrderBookRow key={`ask-${i}`} order={o} type="ask" maxCumulative={maxCumulative} />
        ))}
      </div>
      <div
        className={cn(
          "my-1 flex items-center justify-center gap-2 border-y border-slate-800 bg-slate-900/60 px-2 py-2 text-lg font-bold",
          priceChange === "up" && "text-emerald-400",
          priceChange === "down" && "text-red-400"
        )}
      >
        {price.toFixed(2)}
        {priceChange === "up" && <span className="text-emerald-400">↑</span>}
        {priceChange === "down" && <span className="text-red-400">↓</span>}
      </div>
      <div className="flex-1 space-y-px overflow-hidden">
        {processedBids.map((o, i) => (
          <OrderBookRow key={`bid-${i}`} order={o} type="bid" maxCumulative={maxCumulative} />
        ))}
      </div>
    </div>
  );
}
