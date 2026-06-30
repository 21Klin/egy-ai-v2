import Link from "next/link";

export default function LearnCryptoPage() {
  return (
    <LearnLayout
      emoji="₿"
      title="How Crypto Trading Works"
      subtitle="What BTC/USDT means, how exchanges work, and why prices move"
      level="Beginner"
      time="6 min read"
      prev={{ href: "/learn/genetic-algorithm", label: "Genetic Algorithms" }}
      next={{ href: "/learn/order-book", label: "The Order Book" }}
    >
      <Section title="What is BTC/USDT?">
        <p>
          BTC/USDT is a <strong className="text-slate-100">trading pair</strong>. It tells you the price of one Bitcoin (BTC) measured in USDT — a stablecoin whose value is pegged 1:1 to the US Dollar.
        </p>
        <p className="mt-3">
          So when you see BTC/USDT = 67,500 it means: right now, one Bitcoin costs 67,500 US Dollars.
        </p>
        <Callout>
          EGY-AI uses BTC/USDT because it&apos;s the most liquid trading pair on Binance — the most traded, with the tightest spreads and the most reliable price data. This gives the genetic algorithm the cleanest signal to learn from.
        </Callout>
      </Section>

      <Section title="What is an exchange?">
        <p>
          A crypto exchange like Binance is a marketplace where buyers and sellers meet. It works like a stock exchange — people post orders to buy or sell at specific prices, and the exchange matches them.
        </p>
        <p className="mt-3">
          Binance processes millions of trades per second. EGY-AI connects directly to Binance&apos;s public data stream via WebSocket, receiving every single trade the moment it happens — no delay, no polling.
        </p>
      </Section>

      <Section title="What is simulated trading?">
        <p>
          EGY-AI is a simulator. It uses <strong className="text-slate-100">real live prices</strong> from Binance, but trades against a <strong className="text-slate-100">simulated balance</strong> — starting at 10,000 USDT — with no real money involved.
        </p>
        <div className="my-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="font-semibold text-emerald-300">✓ What&apos;s real</div>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              <li>• Live BTC price every millisecond</li>
              <li>• Real order book from Binance</li>
              <li>• Real trading fees (0.1%) in fitness calc</li>
              <li>• Real historical candles for GA training</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <div className="font-semibold text-slate-300">◌ What&apos;s simulated</div>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              <li>• Your USDT and BTC balance</li>
              <li>• The trade executions</li>
              <li>• Your profit and loss</li>
              <li>• No real money ever changes hands</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Why do prices move?">
        <p>
          Prices move because of supply and demand. When more people want to buy BTC than sell it, the price goes up. When more want to sell, it goes down.
        </p>
        <p className="mt-3">
          This happens constantly — thousands of traders, algorithms, and institutions placing orders simultaneously. A single tweet from a major figure can shift the price by thousands of dollars in seconds.
        </p>
        <p className="mt-3">
          This is exactly what makes algorithmic trading interesting and difficult. The market is never static — it constantly adapts. A strategy that works today might not work next month. Which is why EGY-AI&apos;s genetic algorithm continuously re-evolves rather than following fixed rules.
        </p>
      </Section>

      <Section title="Spot vs Leverage trading">
        <div className="my-4 space-y-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <div className="font-semibold text-slate-50">Spot trading</div>
            <p className="mt-1 text-xs text-slate-300">
              You buy or sell the actual asset with money you have. If you have 1,000 USDT and BTC costs 50,000, you can buy 0.02 BTC. Simple, lower risk. This is what the &quot;Spot&quot; tab in EGY-AI does.
            </p>
          </div>
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
            <div className="font-semibold text-purple-300">Leverage trading</div>
            <p className="mt-1 text-xs text-slate-300">
              You borrow to amplify your position. With 2x leverage and 1,000 USDT, you control a 2,000 USDT position. Profits are doubled — but so are losses. EGY-AI&apos;s Leverage tab lets you try this with simulated funds at up to 8x.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Key vocabulary">
        <TermList terms={[
          { term: "Trading pair", def: "Two assets traded against each other. BTC/USDT = Bitcoin priced in USDT." },
          { term: "USDT", def: "A stablecoin pegged 1:1 to the US Dollar. Used as the 'cash' in most crypto trades." },
          { term: "Bid", def: "The highest price a buyer is willing to pay right now." },
          { term: "Ask", def: "The lowest price a seller is willing to accept right now." },
          { term: "Spread", def: "The gap between the best bid and best ask. Smaller = more liquid market." },
          { term: "Liquidity", def: "How easy it is to buy or sell without moving the price. BTC has very high liquidity." },
          { term: "Volatility", def: "How much and how fast the price moves. High volatility = big swings." },
          { term: "Slippage", def: "When your order fills at a worse price than expected due to fast market movement." },
        ]} />
      </Section>

      <LiveLink href="/trading" text="See a live BTC/USDT price feed on the trading terminal →" />
    </LearnLayout>
  );
}

function LearnLayout({ emoji, title, subtitle, level, time, prev, next, children }: {
  emoji: string; title: string; subtitle: string; level: string; time: string;
  prev: { href: string; label: string } | null;
  next: { href: string; label: string } | null;
  children: React.ReactNode;
}) {
  const levelColor = level === "Beginner" ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
    : level === "Intermediate" ? "text-blue-300 bg-blue-500/10 border-blue-500/30"
    : "text-purple-300 bg-purple-500/10 border-purple-500/30";
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2">
          <Link href="/learn" className="font-data text-[11px] text-slate-500 hover:text-emerald-300 transition">← Back to Learn</Link>
        </div>
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
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-3 text-lg font-semibold text-slate-50">{title}</h2><div className="text-sm text-slate-300 leading-relaxed space-y-2">{children}</div></section>;
}
function Callout({ children }: { children: React.ReactNode }) {
  return <div className="my-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{children}</div>;
}
function TermList({ terms }: { terms: { term: string; def: string }[] }) {
  return <dl className="space-y-3">{terms.map((t) => (<div key={t.term} className="flex gap-3"><dt className="w-36 shrink-0 font-data text-xs font-bold text-emerald-300">{t.term}</dt><dd className="text-xs text-slate-300">{t.def}</dd></div>))}</dl>;
}
function LiveLink({ href, text }: { href: string; text: string }) {
  return <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center"><Link href={href} className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 transition">{text}</Link></div>;
}
