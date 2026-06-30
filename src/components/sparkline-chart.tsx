"use client";

import { useStore } from "@/lib/store";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

export default function SparklineChart() {
  const { price, priceChange, sparklineData } = useStore();

  if (sparklineData.length < 2) {
    return (
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-28" />
        </div>
        <Skeleton className="h-12 w-24" />
      </div>
    );
  }

  const lastPrice = sparklineData[sparklineData.length - 2]?.value || 0;
  const priceDiff = price - lastPrice;
  const priceDiffPercent = lastPrice > 0 ? (priceDiff / lastPrice) * 100 : 0;
  const isUp = priceDiff >= 0;

  return (
    <div className="flex h-12 items-center justify-between gap-4">
      <div className="flex-shrink-0">
        <div className="text-sm text-muted-foreground">BTC/USDT</div>
        <div
          className={cn(
            "flex items-baseline gap-2 text-2xl font-bold font-data",
            priceChange === "up" && "text-success",
            priceChange === "down" && "text-destructive"
          )}
        >
          {price.toFixed(2)}
          <span className={cn("flex items-center text-xs font-medium", isUp ? "text-success" : "text-destructive")}>
            {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {priceDiffPercent.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="h-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparklineData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.8} />
                <stop offset="95%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
              labelStyle={{ color: "#94a3b8" }}
              itemStyle={{ color: "#e2e8f0" }}
            />
            <Area type="monotone" dataKey="value" stroke={isUp ? "#10b981" : "#ef4444"} strokeWidth={2} fill="url(#colorUv)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
