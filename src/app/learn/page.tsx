import Link from "next/link";

const topics = [
  {
    href: "/learn/genetic-algorithm",
    emoji: "🧬",
    title: "Genetic Algorithms",
    level: "Beginner",
    time: "8 min read",
    desc: "How evolution became a programming technique. Learn how populations of solutions compete, breed, and mutate to solve problems no human could hand-code.",
    color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
    tag: "emerald",
  },
  {
    href: "/learn/crypto-trading",
    emoji: "₿",
    title: "How Crypto Trading Works",
    level: "Beginner",
    time: "6 min read",
    desc: "What BTC/USDT actually means, how exchanges work, what a simulated trade is, and why the price changes every millisecond.",
    color: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
    tag: "orange",
  },
  {
    href: "/learn/order-book",
    emoji: "📖",
    title: "The Order Book",
    level: "Intermediate",
    time: "5 min read",
    desc: "The order book is the heartbeat of every exchange. Learn what bids and asks are, what depth means, and how to read buying vs selling pressure.",
    color: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    tag: "blue",
  },
  {
    href: "/learn/rsi",
    emoji: "📈",
    title: "RSI — Relative Strength Index",
    level: "Intermediate",
    time: "5 min read",
    desc: "One of the most used indicators in trading. Learn the math behind RSI, what overbought and oversold really mean, and how EGY-AI uses it as a strategy signal.",
    color: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
    tag: "purple",
  },
  {
    href: "/learn/how-egy-ai-works",
    emoji: "⚙️",
    title: "How EGY-AI Works",
    level: "Advanced",
    time: "10 min read",
    desc: "A full walkthrough of EGY-AI's architecture — from the Binance WebSocket connection to the GA fitness function to how a trade signal becomes a real order.",
    color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
    tag: "cyan",
  },
  {
    href: "/learn/glossary",
    emoji: "📚",
    title: "Glossary",
    level: "Reference",
    time: "Quick reference",
    desc: "Every technical term used across the site, explained in plain language. Bookmark this if you're new to algorithmic trading or genetic algorithms.",
    color: "from-slate-500/20 to-slate-500/5 border-slate-500/30",
    tag: "slate",
  },
];

const levelColor: Record<string, string> = {
  Beginner: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  Intermediate: "text-blue-300 bg-blue-500/10 border-blue-500/30",
  Advanced: "text-purple-300 bg-purple-500/10 border-purple-500/30",
  Reference: "text-slate-300 bg-slate-500/10 border-slate-500/30",
};

export default function LearnPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mx-auto max-w-5xl">

        {/* HERO */}
        <section className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 font-data text-[11px] text-emerald-200">
            🎓 Educational resource · Built with EGY-AI
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Learn how it{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
              actually works
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
            EGY-AI isn&apos;t a black box. Every concept behind it — genetic
            algorithms, crypto markets, technical indicators — is explained
            here in plain language. Read, then go watch it live on the
            trading terminal.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Beginner friendly</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" /> Intermediate concepts</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-400" /> Advanced architecture</span>
          </div>
        </section>

        {/* TOPIC GRID */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`group relative flex flex-col rounded-2xl border bg-gradient-to-br p-5 transition-all hover:scale-[1.02] hover:shadow-lg ${t.color}`}
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="text-2xl">{t.emoji}</span>
                <span className={`rounded-full border px-2 py-0.5 font-data text-[10px] ${levelColor[t.level]}`}>
                  {t.level}
                </span>
              </div>
              <h2 className="text-base font-semibold text-slate-50">{t.title}</h2>
              <p className="mt-2 flex-1 text-xs text-slate-300 leading-relaxed">{t.desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-data text-[10px] text-slate-500">{t.time}</span>
                <span className="font-data text-[11px] text-emerald-300 transition group-hover:translate-x-1">
                  Read →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* BOTTOM CTA */}
        <section className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-50">
            Ready to see it in action?
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            After reading, go watch the genetic algorithm evolve live on real
            BTC/USDT data. Everything you just learned is running right there.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/ga-dashboard"
              className="rounded-full bg-gradient-to-r from-emerald-400 to-purple-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.04]"
            >
              Watch the GA evolve
            </Link>
            <Link
              href="/trading"
              className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Open trading terminal
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
