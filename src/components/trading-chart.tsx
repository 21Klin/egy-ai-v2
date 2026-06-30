"use client";

import { memo, useEffect, useRef } from "react";

declare global {
  interface Window {
    TradingView: any;
  }
}

function TradingViewWidget() {
  const container = useRef<HTMLDivElement>(null);
  const isWidgetCreated = useRef(false);

  useEffect(() => {
    if (!container.current || isWidgetCreated.current) return;

    const checkTradingView = () => {
      if (typeof window.TradingView !== "undefined") {
        new window.TradingView.widget({
          autosize: true,
          symbol: "BINANCE:BTCUSDT",
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          withdateranges: false,
          hide_side_toolbar: true,
          hide_top_toolbar: true,
          allow_symbol_change: false,
          container_id: container.current?.id,
          studies: ["Volume@tv-basicstudies"],
        });
        isWidgetCreated.current = true;
      } else {
        setTimeout(checkTradingView, 100);
      }
    };

    checkTradingView();
  }, []);

  return (
    <div className="h-full w-full" ref={container} id="tradingview_chart_container">
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-500">Loading trading chart…</p>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
