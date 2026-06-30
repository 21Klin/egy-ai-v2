"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TradingChart from "@/components/trading-chart";
import TradePanel from "@/components/trade-panel";
import OrderBook from "@/components/order-book";
import SparklineChart from "@/components/sparkline-chart";
import RecentTrades from "@/components/recent-trades";
import MiniTradingViewWidget from "@/components/MiniTradingViewWidget";
import Link from "next/link";
import { KraferSimLogo } from "@/components/icons";

function TradingHeader() {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400/20 to-purple-500/20 border border-emerald-500/30">
          <KraferSimLogo className="h-4 w-4 text-emerald-300" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-100">EGY-AI Trading Terminal</div>
          <div className="font-data text-[10px] text-slate-500">BTC/USDT · Simulated · Live Binance feed</div>
        </div>
      </div>
      <Link
        href="/ga-dashboard"
        className="hud-corners flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 font-data text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
      >
        <span className="circuit-node" />
        GA Dashboard →
      </Link>
    </div>
  );
}

export default function TradingPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 text-slate-50">
      <TradingHeader />
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
        <Card className="led-edge bg-slate-900/60 border-slate-800">
          <CardContent className="p-4">
            <SparklineChart />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col gap-4">
            <Card className="h-[420px] bg-slate-900/60 border-slate-800 sm:h-[500px]">
              <TradingChart />
            </Card>
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent Trades</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RecentTrades />
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <TradePanel />
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Order Book</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <OrderBook />
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Momentum (RSI)</CardTitle>
              </CardHeader>
              <CardContent className="p-0" style={{ height: 320 }}>
                <MiniTradingViewWidget />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
