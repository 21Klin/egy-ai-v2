export default function GuidePage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-4xl space-y-8">
        <section>
          <p className="font-data text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
            Documentation
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            How to use{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-purple-400 bg-clip-text text-transparent">
              EGY-AI
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            A complete walkthrough of every feature — from the live price feed
            to the genetic algorithm engine.
          </p>
        </section>

        <div className="space-y-4">
          <GuideSection
            n="1"
            title="Live Price Feed"
            body="The BTC/USDT price updates multiple times per second using a direct WebSocket connection to Binance. This powers the sparkline chart, order book, and all real-time components across the site. No API key or login is needed — Binance's public streams are used."
          />
          <GuideSection
            n="2"
            title="Order Book"
            body="Shows real-time buy (bids) and sell (asks) pressure from Binance. Green represents buying interest, red represents selling. The depth bars show cumulative volume so you can see where large order clusters sit."
          />
          <GuideSection
            n="3"
            title="RSI Momentum"
            body="The Relative Strength Index (RSI) chart in the Trading page uses a live TradingView widget on the real BINANCE:BTCUSDT feed. RSI above 70 suggests overbought conditions, below 30 suggests oversold. The GA bot uses this signal as one of its strategy parameters."
          />
          <GuideSection
            n="4"
            title="Spot Trading"
            body="Use the Spot tab in the Trade Panel to buy or sell BTC with your simulated USDT balance. Start with 10,000 USDT. Choose an amount, click BUY or SELL, and your balance updates instantly. No real funds are ever used."
          />
          <GuideSection
            n="5"
            title="Leverage Trading"
            body="The Leverage tab lets you open leveraged long or short positions. Choose your leverage multiplier (1x–8x) and position size. Your live P&L updates in real time as the price moves. Click Close Position to exit and settle your balance."
          />
          <GuideSection
            n="6"
            title="GA Bot"
            body="The GA Bot tab runs the genetic algorithm engine. Toggle it on to start evolving. The bot fetches real 1-minute BTC candles from Binance, evaluates 24 strategy variants, and evolves toward better ones every 45 seconds. When the best strategy signals a trade, the bot executes it on your simulated balance automatically. A built-in daily stop-loss pauses the bot if simulated losses exceed 8% in one session."
          />
          <GuideSection
            n="7"
            title="GA Dashboard"
            body="The full live evolution view. Shows the current generation, best-ever fitness score, the exact parameters of the winning strategy (fast MA, slow MA, RSI thresholds), fitness bars for the top 5 individuals, and a scrolling log of every generation. Starting or stopping the bot on the Trading page is reflected here instantly — they share the same engine."
          />
          <GuideSection
            n="8"
            title="Bot History"
            body="Every trade executed by the GA bot is logged here with timestamp, side (BUY/SELL), price, and size. The equity curve at the top shows your total simulated portfolio value over time. Data resets when you close the browser tab — this is a session-based simulator with no persistent backend."
          />
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-sm font-semibold text-slate-50 mb-2">Important note</h2>
          <p className="text-xs text-slate-300">
            EGY-AI is a student-built educational simulator. All trades are
            simulated — no real funds are at risk. The genetic algorithm and
            trading signals are for demonstration and learning purposes only,
            and should not be used as financial advice.
          </p>
        </section>
      </div>
    </div>
  );
}

function GuideSection({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 font-data text-[11px] font-semibold text-emerald-300">
        {n}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-50">{title}</h2>
        <p className="mt-1 text-xs text-slate-300 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
