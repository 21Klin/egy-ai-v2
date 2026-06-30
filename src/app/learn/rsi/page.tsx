import Link from "next/link";

export default function LearnRSIPage() {
  return (
    <LearnLayout
      emoji="📈"
      title="RSI — Relative Strength Index"
      subtitle="Understanding momentum, overbought, and oversold conditions"
      level="Intermediate"
      time="5 min read"
      prev={{ href: "/learn/order-book", label: "The Order Book" }}
      next={{ href: "/learn/how-egy-ai-works", label: "How EGY-AI Works" }}
    >
      <Section title="What is RSI?">
        <p>
          The Relative Strength Index (RSI) is a momentum indicator that
          measures how fast and how much a price has been moving recently.
          It outputs a number between 0 and 100.
        </p>
        <p className="mt-3">
          It was created by J. Welles Wilder in 1978 and is still one of
          the most widely used indicators in trading today — both by human
          traders and algorithmic systems like EGY-AI.
        </p>
      </Section>

      <Section title="The RSI scale">
        <p className="mb-4">RSI is always between 0 and 100. The key levels to know:</p>
        <RSIGauge />
        <div className="mt-4 space-y-3">
          <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <span className="font-data text-sm font-bold text-red-300">70+</span>
            <div>
              <div className="text-sm font-semibold text-red-200">Overbought</div>
              <p className="text-xs text-slate-300">The asset has been rising strongly. Some traders see this as a signal to sell or expect a pullback — though the price can keep rising even above 70.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-slate-700 bg-slate-800/40 p-3">
            <span className="font-data text-sm font-bold text-slate-300">30–70</span>
            <div>
              <div className="text-sm font-semibold text-slate-200">Neutral</div>
              <p className="text-xs text-slate-300">Normal trading range. No strong overbought or oversold signal. Most of the time BTC RSI sits here.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <span className="font-data text-sm font-bold text-emerald-300">30−</span>
            <div>
              <div className="text-sm font-semibold text-emerald-200">Oversold</div>
              <p className="text-xs text-slate-300">The asset has been falling strongly. Potential buy signal — though a falling asset can keep falling past 30 too.</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="How RSI is calculated">
        <p>RSI is based on the average gains vs average losses over a lookback period (usually 14 candles):</p>
        <div className="my-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 font-data text-xs">
          <div className="text-slate-400 mb-1">Step 1: calculate average gain and average loss over 14 periods</div>
          <div className="text-emerald-300 mb-3">RS = Average Gain ÷ Average Loss</div>
          <div className="text-slate-400 mb-1">Step 2: convert to 0–100 scale</div>
          <div className="text-emerald-300">RSI = 100 − (100 ÷ (1 + RS))</div>
        </div>
        <p>
          When gains dominate → RS is large → RSI approaches 100.<br />
          When losses dominate → RS approaches 0 → RSI approaches 0.
        </p>
      </Section>

      <Section title="How EGY-AI uses RSI">
        <p>
          EGY-AI&apos;s genetic algorithm evolves two RSI parameters per strategy:
        </p>
        <div className="my-4 space-y-2">
          <div className="flex gap-3 rounded-lg border border-slate-700 bg-slate-800/40 p-3">
            <span className="font-data text-xs font-bold text-purple-300 w-24 shrink-0">rsiPeriod</span>
            <span className="text-xs text-slate-300">How many candles to look back. Smaller = more sensitive to recent moves. Larger = smoother, less noise.</span>
          </div>
          <div className="flex gap-3 rounded-lg border border-slate-700 bg-slate-800/40 p-3">
            <span className="font-data text-xs font-bold text-purple-300 w-24 shrink-0">rsiHigh</span>
            <span className="text-xs text-slate-300">The threshold above which the GA won&apos;t open a long position. Prevents buying into already-overbought conditions.</span>
          </div>
        </div>
        <p>
          The GA evolves these values rather than fixing them at the textbook
          70/30. Some market conditions reward a tighter threshold (60/40),
          others a looser one (80/20). The algorithm finds what works best
          on recent real data.
        </p>
        <Callout>
          The RSI chart on the Trading page uses a live TradingView widget
          connected directly to Binance — the same real data the GA bot
          is reading when it makes decisions.
        </Callout>
      </Section>

      <Section title="RSI limitations">
        <p>
          RSI is useful but not perfect. In strong trending markets, it can
          stay overbought (above 70) or oversold (below 30) for a long time
          without the price reversing. This is called a &quot;sustained trend&quot;
          and it catches many traders who blindly sell every time RSI hits 70.
        </p>
        <p className="mt-3">
          This is one reason EGY-AI combines RSI with moving averages rather
          than using RSI alone — multiple signals together are more reliable
          than any single indicator.
        </p>
      </Section>

      <Section title="Key vocabulary">
        <TermList terms={[
          { term: "RSI", def: "Relative Strength Index. A 0–100 momentum indicator." },
          { term: "Momentum", def: "The speed and magnitude of recent price movement." },
          { term: "Overbought", def: "RSI above 70 — asset has risen strongly, potential reversal zone." },
          { term: "Oversold", def: "RSI below 30 — asset has fallen strongly, potential bounce zone." },
          { term: "Period (14)", def: "The number of candles RSI looks back over. 14 is the standard." },
          { term: "Divergence", def: "When price makes a new high but RSI doesn't — a potential reversal signal." },
        ]} />
      </Section>

      <LiveLink href="/trading" text="Watch live RSI on the EGY-AI trading terminal →" />
    </LearnLayout>
  );
}

function RSIGauge() {
  const zones = [
    { label: "0", x: 0 },
    { label: "30", x: 30 },
    { label: "50", x: 50 },
    { label: "70", x: 70 },
    { label: "100", x: 100 },
  ];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="relative h-6 w-full overflow-hidden rounded-full">
        <div className="absolute inset-0 flex">
          <div className="h-full bg-emerald-500/40" style={{ width: "30%" }} />
          <div className="h-full bg-slate-700/40" style={{ width: "40%" }} />
          <div className="h-full bg-red-500/40" style={{ width: "30%" }} />
        </div>
      </div>
      <div className="relative mt-1 flex justify-between font-data text-[10px] text-slate-400">
        {zones.map((z) => (
          <span key={z.label}>{z.label}</span>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-data text-[10px]">
        <span className="text-emerald-300">Oversold</span>
        <span className="text-slate-400">Neutral</span>
        <span className="text-red-300">Overbought</span>
      </div>
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
