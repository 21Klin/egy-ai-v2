import Link from "next/link";

export default function LearnOrderBookPage() {
  return (
    <LearnLayout
      emoji="📖"
      title="The Order Book"
      subtitle="The heartbeat of every exchange — understanding bids, asks, and depth"
      level="Intermediate"
      time="5 min read"
      prev={{ href: "/learn/crypto-trading", label: "How Crypto Trading Works" }}
      next={{ href: "/learn/rsi", label: "RSI — Relative Strength Index" }}
    >
      <Section title="What is an order book?">
        <p>
          An order book is a live list of all the buy and sell orders currently
          waiting to be filled on an exchange. Think of it as a marketplace
          notice board — buyers pin &quot;I want to buy 0.5 BTC at $67,400&quot;
          and sellers pin &quot;I want to sell 0.3 BTC at $67,450.&quot;
        </p>
        <p className="mt-3">
          The exchange constantly matches buyers with sellers. When a buyer&apos;s
          price meets a seller&apos;s price, a trade happens and both orders are
          removed from the book.
        </p>
      </Section>

      <Section title="Bids vs Asks">
        <div className="my-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="font-semibold text-emerald-300">Bids (Buy orders)</div>
            <p className="mt-2 text-xs text-slate-300">
              People who want to BUY BTC. Listed from highest to lowest price.
              The top bid is the best (highest) price anyone is willing to pay
              right now.
            </p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="font-semibold text-red-300">Asks (Sell orders)</div>
            <p className="mt-2 text-xs text-slate-300">
              People who want to SELL BTC. Listed from lowest to highest price.
              The top ask is the best (lowest) price anyone is willing to sell
              for right now.
            </p>
          </div>
        </div>
        <Callout>
          The gap between the best bid and the best ask is the <strong>spread</strong>. For BTC on Binance, this is usually just $1-2 — one of the tightest spreads in any market, which is why EGY-AI uses it.
        </Callout>
      </Section>

      <Section title="Reading the order book">
        <p className="mb-4">Here&apos;s a simplified example of what an order book looks like:</p>
        <SampleOrderBook />
        <p className="mt-4 text-xs text-slate-400">
          The mid price ($67,420) is between the best ask and best bid.
          The depth bars show how much volume sits at each level — wider
          bars mean larger orders waiting there.
        </p>
      </Section>

      <Section title="What order book depth tells you">
        <p>
          &quot;Depth&quot; refers to how much volume exists at each price level. A
          deep order book means large orders on both sides — this is a sign of
          a healthy, liquid market where big trades can happen without moving
          the price much.
        </p>
        <p className="mt-3">
          Traders watch for unusual depth changes as signals. A sudden wall of
          sell orders appearing above the current price can signal resistance
          — a barrier the price might struggle to break through. A large bid
          wall below can signal support.
        </p>
      </Section>

      <Section title="How EGY-AI uses the order book">
        <p>
          EGY-AI connects to Binance&apos;s depth stream (updated every 100ms)
          and displays the live order book on the Trading page. The GA&apos;s
          strategy parameters don&apos;t directly read the order book today —
          they use moving averages and RSI — but the order book is visible
          to you as a trader and provides important context for understanding
          why the bot&apos;s signals behave the way they do.
        </p>
      </Section>

      <Section title="Key vocabulary">
        <TermList terms={[
          { term: "Bid", def: "A buy order. The highest bid is what buyers are willing to pay right now." },
          { term: "Ask", def: "A sell order. The lowest ask is what sellers will accept right now." },
          { term: "Spread", def: "The difference between best bid and best ask. Measures market liquidity." },
          { term: "Depth", def: "The total volume of orders at each price level." },
          { term: "Market order", def: "Buy or sell immediately at whatever price is available." },
          { term: "Limit order", def: "Buy or sell only at a specific price. Sits in the book until matched." },
          { term: "Support", def: "A price level with strong buying interest — price tends to bounce here." },
          { term: "Resistance", def: "A price level with strong selling pressure — price tends to stall here." },
        ]} />
      </Section>

      <LiveLink href="/trading" text="Watch the live BTC/USDT order book update in real time →" />
    </LearnLayout>
  );
}

function SampleOrderBook() {
  const asks = [
    { price: "67,450", size: "0.842", width: 30 },
    { price: "67,435", size: "1.204", width: 50 },
    { price: "67,425", size: "2.100", width: 80 },
  ];
  const bids = [
    { price: "67,418", size: "1.950", width: 75 },
    { price: "67,405", size: "1.120", width: 45 },
    { price: "67,390", size: "0.680", width: 25 },
  ];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden font-data text-xs">
      <div className="grid grid-cols-2 px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
        <span>Price (USDT)</span><span className="text-right">Size (BTC)</span>
      </div>
      {asks.reverse().map((row) => (
        <div key={row.price} className="relative grid grid-cols-2 px-3 py-1">
          <div className="absolute right-0 top-0 bottom-0 bg-red-500/10" style={{ width: `${row.width}%` }} />
          <span className="relative text-red-300">{row.price}</span>
          <span className="relative text-right text-slate-200">{row.size}</span>
        </div>
      ))}
      <div className="grid grid-cols-2 bg-slate-800/60 px-3 py-2 text-sm font-bold">
        <span className="text-slate-100">67,420</span>
        <span className="text-right text-slate-400 text-[10px] font-normal">mid price</span>
      </div>
      {bids.map((row) => (
        <div key={row.price} className="relative grid grid-cols-2 px-3 py-1">
          <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/10" style={{ width: `${row.width}%` }} />
          <span className="relative text-emerald-300">{row.price}</span>
          <span className="relative text-right text-slate-200">{row.size}</span>
        </div>
      ))}
    </div>
  );
}

function LearnLayout({ emoji, title, subtitle, level, time, prev, next, children }: any) {
  const levelColor = level === "Beginner" ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
    : level === "Intermediate" ? "text-blue-300 bg-blue-500/10 border-blue-500/30"
    : "text-purple-300 bg-purple-500/10 border-purple-500/30";
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
function TermList({ terms }: any) {
  return <dl className="space-y-3">{terms.map((t: any) => (<div key={t.term} className="flex gap-3"><dt className="w-36 shrink-0 font-data text-xs font-bold text-emerald-300">{t.term}</dt><dd className="text-xs text-slate-300">{t.def}</dd></div>))}</dl>;
}
function LiveLink({ href, text }: any) {
  return <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center"><Link href={href} className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 transition">{text}</Link></div>;
}
