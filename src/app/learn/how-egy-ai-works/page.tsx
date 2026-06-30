import Link from "next/link";

export default function LearnHowEgyAiWorksPage() {
  return (
    <LearnLayout
      emoji="⚙️"
      title="How EGY-AI Works"
      subtitle="A full walkthrough of the architecture — from live tick to trade signal"
      level="Advanced"
      time="10 min read"
      prev={{ href: "/learn/rsi", label: "RSI — Relative Strength Index" }}
      next={{ href: "/learn/glossary", label: "Glossary" }}
    >
      <Section title="The big picture">
        <p>
          EGY-AI is a complete algorithmic trading system built as a web app.
          It has three main layers working together:
        </p>
        <div className="my-4 space-y-2">
          <Layer n="1" color="emerald" title="Data layer" desc="Connects to Binance's public WebSocket streams and REST API to get real-time price, order book, and historical candle data." />
          <Layer n="2" color="purple" title="Strategy layer" desc="The genetic algorithm engine. Evolves a population of trading strategies on real candle data, evaluating each one for fitness and breeding better ones." />
          <Layer n="3" color="blue" title="Presentation layer" desc="The Next.js web app you're looking at. Renders live charts, the order book, the GA dashboard, bot history, and everything else in real time." />
        </div>
      </Section>

      <Section title="Step 1 — Live data arrives">
        <p>
          When the app loads, it opens four simultaneous WebSocket connections
          to Binance:
        </p>
        <div className="my-3 space-y-2 font-data text-xs">
          <WSRow stream="btcusdt@trade" desc="Every individual trade — price + quantity + timestamp. Updates multiple times per second." color="emerald" />
          <WSRow stream="btcusdt@depth20@100ms" desc="Top 20 bids and asks, refreshed every 100ms. Powers the live order book." color="blue" />
          <WSRow stream="btcusdt@ticker" desc="24-hour statistics — volume, % change, high, low. Updates continuously." color="purple" />
          <WSRow stream="btcusdt@kline_1m" desc="1-minute candles as they form. The GA engine uses these for strategy evaluation." color="orange" />
        </div>
        <p className="mt-3">
          Additionally, on startup, 500 completed 1-minute candles are fetched
          from Binance&apos;s REST API to give the GA historical data to train on
          immediately.
        </p>
      </Section>

      <Section title="Step 2 — The GA engine initialises">
        <p>
          When you click &quot;Start&quot; on the GA Bot tab or GA Dashboard, the
          engine initialises a population of 24 individuals. Each individual
          is a <strong className="text-slate-100">Genome</strong> — a set of
          5 strategy parameters:
        </p>
        <div className="my-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 font-data text-xs space-y-2">
          <GenomeRow param="fastMa" range="3–24" desc="Short moving average window. Tracks recent price trend." />
          <GenomeRow param="slowMa" range="fastMa+5 to 80" desc="Long moving average window. Tracks longer-term trend." />
          <GenomeRow param="rsiPeriod" range="5–30" desc="How many candles to calculate RSI over." />
          <GenomeRow param="rsiLow" range="10–45" desc="RSI threshold below which the strategy won't go short." />
          <GenomeRow param="rsiHigh" range="55–90" desc="RSI threshold above which the strategy won't go long." />
        </div>
        <p>
          Each parameter starts at a random value within its allowed range.
          No hand-tuning, no human intuition — pure random initialisation.
        </p>
      </Section>

      <Section title="Step 3 — Fitness evaluation">
        <p>
          Every 45 seconds, the engine evaluates each individual by
          backtesting its strategy against the 500 most recent real candles.
          The fitness score is not just profit — it&apos;s a composite metric:
        </p>
        <div className="my-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 font-data text-xs">
          <div className="text-slate-400 mb-2">fitness = net_equity − (max_drawdown × 2.0)</div>
          <div className="space-y-1 text-slate-300">
            <div><span className="text-emerald-300">net_equity</span> = final portfolio value after all fees deducted</div>
            <div><span className="text-red-300">max_drawdown × 2.0</span> = worst peak-to-trough loss, penalised heavily</div>
          </div>
        </div>
        <p>
          This means a risky strategy that got lucky once won&apos;t score as
          well as a consistent strategy with smaller but steady returns. The
          2x drawdown penalty specifically pushes the GA toward capital
          preservation over gambling.
        </p>
        <Callout>
          Transaction costs (0.10% per trade, matching Binance&apos;s taker fee)
          are deducted from every strategy&apos;s backtest result. This prevents
          the GA from evolving high-frequency strategies that look profitable
          on paper but lose money to fees in practice.
        </Callout>
      </Section>

      <Section title="Step 4 — Selection and evolution">
        <p>
          After evaluation, the top 4 individuals (elites) survive unchanged
          into the next generation. The remaining 20 spots are filled by
          children created through:
        </p>
        <div className="my-4 space-y-3">
          <Step title="Tournament selection" color="purple">
            5 random individuals compete, and the best one is selected as a
            parent. This is done twice to get two parents. Tournament
            selection favours good solutions while still giving weaker ones
            a small chance — maintaining diversity.
          </Step>
          <Step title="Arithmetic crossover" color="blue">
            The two parents&apos; parameters are mixed using a random blend factor
            α. Each child parameter = parentA × α + parentB × (1−α). The
            child inherits from both parents proportionally.
          </Step>
          <Step title="Mutation" color="orange">
            Each parameter has a 25% chance of being nudged randomly. This
            ensures the GA keeps exploring new territory rather than
            converging prematurely on one solution.
          </Step>
        </div>
      </Section>

      <Section title="Step 5 — Trade signal generation">
        <p>
          After each generation, the best individual&apos;s strategy is evaluated
          on the most recent candle. The signal is determined by:
        </p>
        <div className="my-3 space-y-2">
          <SignalRow signal="BUY" color="emerald" condition="fastMA > slowMA AND RSI < rsiHigh — upward momentum, not yet overbought" />
          <SignalRow signal="SELL" color="red" condition="fastMA < slowMA — downward momentum confirmed" />
          <SignalRow signal="HOLD" color="slate" condition="No clear directional signal from the current best genome" />
        </div>
        <p className="mt-3">
          When the GA Bot is running on the Trading page, these signals
          trigger real simulated trades on your balance — buying or selling
          100 USDT worth of BTC per signal.
        </p>
      </Section>

      <Section title="Step 6 — Stop-loss protection">
        <p>
          EGY-AI has a built-in circuit breaker. If the bot&apos;s trading causes
          the simulated portfolio to drop more than 8% from its value when
          the bot started, it pauses automatically and shows a warning.
        </p>
        <p className="mt-3">
          This reflects real professional practice — no serious algorithmic
          trading system runs without a maximum drawdown limit. It keeps a
          single bad run from erasing all previous gains.
        </p>
      </Section>

      <Section title="The singleton architecture">
        <p>
          One architectural detail worth understanding: the GA engine is a
          global singleton store (using Zustand). This means there is exactly
          one population, one generation counter, and one evolution loop
          running — shared by every component in the app.
        </p>
        <p className="mt-3">
          Whether you&apos;re on the Trading page, the GA Dashboard, or any
          other page — they all read from the same engine. Starting the bot
          on the Trading page shows up immediately on the GA Dashboard, and
          vice versa. There&apos;s no duplication, no disagreement.
        </p>
      </Section>

      <LiveLink href="/ga-dashboard" text="Watch the full pipeline run live on the GA Dashboard →" />
    </LearnLayout>
  );
}

function Layer({ n, color, title, desc }: any) {
  const colors: any = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    purple: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  };
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 font-data text-xs font-bold">{n}</div>
      <div><div className="font-semibold text-slate-50">{title}</div><p className="mt-1 text-xs text-slate-300">{desc}</p></div>
    </div>
  );
}

function WSRow({ stream, desc, color }: any) {
  const colors: any = {
    emerald: "text-emerald-300", blue: "text-blue-300",
    purple: "text-purple-300", orange: "text-orange-300",
  };
  return (
    <div className="flex gap-3 rounded-lg border border-slate-700 bg-slate-800/40 p-2.5">
      <span className={`shrink-0 ${colors[color]}`}>{stream}</span>
      <span className="text-slate-400">→ {desc}</span>
    </div>
  );
}

function GenomeRow({ param, range, desc }: any) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-purple-300">{param}</span>
      <span className="w-20 shrink-0 text-slate-500">{range}</span>
      <span className="text-slate-300">{desc}</span>
    </div>
  );
}

function Step({ title, color, children }: any) {
  const colors: any = {
    purple: "border-purple-500/30 bg-purple-500/10",
    blue: "border-blue-500/30 bg-blue-500/10",
    orange: "border-orange-500/30 bg-orange-500/10",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="font-semibold text-slate-50">{title}</div>
      <p className="mt-1 text-xs text-slate-300">{children}</p>
    </div>
  );
}

function SignalRow({ signal, color, condition }: any) {
  const colors: any = {
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    red: "text-red-300 bg-red-500/10 border-red-500/30",
    slate: "text-slate-300 bg-slate-500/10 border-slate-500/30",
  };
  return (
    <div className="flex items-start gap-3">
      <span className={`shrink-0 rounded border px-2 py-0.5 font-data text-xs font-bold ${colors[color]}`}>{signal}</span>
      <span className="text-xs text-slate-300">{condition}</span>
    </div>
  );
}

function LearnLayout({ emoji, title, subtitle, level, time, prev, next, children }: any) {
  const levelColor = "text-purple-300 bg-purple-500/10 border-purple-500/30";
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2"><Link href="/learn" className="font-data text-[11px] text-slate-500 hover:text-emerald-300 transition">← Back to Learn</Link></div>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{emoji}</span>
            <span className={`rounded-full border px-2 py-0.5 font-data text-[10px] ${levelColor}`}>{level}</span>
            <span className="font-data text-[10px] text-slate-500">{time}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-slate-400">{subtitle}</p>
        </div>
        <div className="space-y-10">{children}</div>
        <div className="mt-12 flex items-center justify-between border-t border-slate-800 pt-6">
          {prev ? <Link href={prev.href} className="text-xs text-slate-400 hover:text-emerald-300 transition">← {prev.label}</Link> : <div />}
          {next ? <Link href={next.href} className="text-xs text-emerald-300 hover:text-emerald-200 transition">{next.label} →</Link> : <div />}
        </div>
      </div>
    </div>
  );
}
function Section({ title, children }: any) {
  return <section><h2 className="mb-3 text-lg font-semibold text-slate-50">{title}</h2><div className="text-sm text-slate-300 leading-relaxed space-y-2">{children}</div></section>;
}
function Callout({ children }: any) {
  return <div className="my-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{children}</div>;
}
function LiveLink({ href, text }: any) {
  return <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center"><Link href={href} className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 transition">{text}</Link></div>;
}
