"use client";

import { memo, useEffect, useRef } from "react";

export default memo(function MiniTradingViewWidget() {
  const container = useRef<HTMLDivElement | null>(null);
  const isWidgetCreated = useRef(false);

  useEffect(() => {
    if (!container.current || isWidgetCreated.current) return;

    const checkTradingView = () => {
      const TV = (window as any).TradingView;
      if (TV && TV.widget) {
        new TV.widget({
          autosize: true,
          symbol: "BINANCE:BTCUSDT",
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "3",
          locale: "en",
          hide_side_toolbar: true,
          hide_top_toolbar: true,
          hide_legend: true,
          allow_symbol_change: false,
          withdateranges: false,
          container_id: "tradingview_rsi_only_widget",
          studies: [
            {
              id: "RSI@tv-basicstudies",
              inputs: { length: 14 },
              styles: { "plot.color": "#10b981", "plot.linewidth": 2 },
            },
          ],
          disabled_features: [
            "header_compare",
            "header_symbol_search",
            "header_saveload",
            "footer_logo",
            "volume_force_overlay",
            "display_market_status",
            "symbol_info",
            "timeframes_toolbar",
            "legend_widget",
            "edit_buttons_in_legend",
            "left_toolbar",
          ],
        });
        isWidgetCreated.current = true;
      } else {
        setTimeout(checkTradingView, 150);
      }
    };

    checkTradingView();
  }, []);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <div ref={container} id="tradingview_rsi_only_widget" style={{ height: "100%", width: "100%" }}>
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading RSI…</div>
      </div>
    </div>
  );
});
