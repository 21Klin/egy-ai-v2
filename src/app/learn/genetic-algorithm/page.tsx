import Link from "next/link";

export default function LearnGAPage() {
  return (
    <LearnLayout
      emoji="🧬"
      title="Genetic Algorithms"
      subtitle="How evolution became a programming technique"
      level="Beginner"
      time="8 min read"
      prev={null}
      next={{ href: "/learn/crypto-trading", label: "How Crypto Trading Works" }}
    >
      <Section title="The core idea">
        <p>
          A genetic algorithm (GA) is a way of solving problems by mimicking
          how biological evolution works. Instead of writing step-by-step
          instructions to find the best answer, you let a <em>population</em>{" "}
          of candidate solutions compete, and the best ones survive and
          reproduce.
        </p>
        <p className="mt-3">
          Over many generations, the population gets better and better at
          solving the problem — not because you told it how, but because bad
          solutions die out and good ones pass their traits to the next
          generation.
        </p>
        <Callout>
          Think of it like breeding dogs for speed. You don&apos;t engineer
          the perfect dog from scratch. You pick the fastest ones, breed them,
          and repeat — until the population is full of fast dogs.
        </Callout>
      </Section>

      <Section title="The four steps of every GA">
        <div className="my-4 space-y-3">
          <Step n="1" color="emerald" title="Initialisation">
            Create a population of random solutions. In EGY-AI, each solution
            is a set of trading strategy parameters: how long a moving average
            window to use, what RSI threshold to enter on, how much risk to
            take per trade.
          </Step>
          <Step n="2" color="blue" title="Fitness evaluation">
            Test each solution against real market data. In EGY-AI, we
            backtest each strategy on real historical BTC candles and give it
            a fitness score based on how well it would have performed —
            accounting for fees and drawdown, not just raw profit.
          </Step>
          <Step n="3" color="purple" title="Selection & Crossover">
            The best-performing strategies are selected as &quot;parents.&quot;
            They produce children by mixing their parameters together
            (crossover). If two good strategies each have one useful trait,
            their child might have both.
          </Step>
          <Step n="4" color="orange" title="Mutation">
            Randomly change a small part of some children. This prevents the
            population from getting stuck on a local optimum — introducing
            new variations the crossover alone would never discover.
          </Step>
        </div>
        <p className="text-sm text-slate-300">
          Then the new generation replaces the old one, and the cycle repeats.
          Over time the population converges toward better and better
          solutions.
        </p>
      </Section>

      {/* VISUAL CYCLE DIAGRAM */}
      <Section title="The evolution cycle">
        <p className="mb-4 text-sm text-slate-300">
          Here&apos;s what one generation looks like in EGY-AI:
        </p>
        <div className="overflow-x-auto">
          <EvolutionDiagram />
        </div>
      </Section>

      <Section title="Why use a GA for trading?">
        <p>
          A trading strategy has many parameters — moving average lengths, RSI
          thresholds, stop-loss levels, entry timing. Finding the best
          combination by hand is practically impossible.
        </p>
        <p className="mt-3">
          You could try every combination (brute force), but with even 5
          parameters and 20 possible values each, that&apos;s 3.2 million
          combinations. A GA finds a very good solution in a fraction of
          that time by intelligently exploring the search space.
        </p>
        <Callout color="purple">
          EGY-AI evolves a population of 24 strategy variants every 45
          seconds, on real historical BTC/USDT candles fetched live from
          Binance. The best-performing strategy sends the live trade signals.
        </Callout>
      </Section>

      <Section title="Key vocabulary">
        <TermList terms={[
          { term: "Population", def: "A group of candidate solutions. EGY-AI uses 24 individuals per generation." },
          { term: "Individual / Genome", def: "One specific set of strategy parameters — one candidate solution." },
          { term: "Fitness", def: "A score measuring how good an individual is. Higher = better performance." },
          { term: "Selection", def: "Picking the best individuals to reproduce. EGY-AI uses tournament selection." },
          { term: "Crossover", def: "Combining two parents to create a child that inherits traits from both." },
          { term: "Mutation", def: "Randomly changing part of an individual to introduce new variation." },
          { term: "Generation", def: "One full cycle of evaluation → selection → crossover → mutation." },
          { term: "Elitism", def: "Keeping the best individuals unchanged so good solutions are never lost." },
        ]} />
      </Section>

      <LiveLink href="/ga-dashboard" text="Watch EGY-AI's genetic algorithm evolve live on real BTC data →" />
    </LearnLayout>
  );
}

function EvolutionDiagram() {
  const stages = [
    { label: "24 strategies", sub: "Population", color: "#10b981" },
    { label: "Backtest each", sub: "Fitness eval", color: "#3b82f6" },
    { label: "Best 4 survive", sub: "Selection", color: "#a855f7" },
    { label: "Breed + mutate", sub: "Next gen", color: "#f97316" },
  ];
  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:justify-center">
      {stages.map((s, i) => (
        <div key={s.label} className="flex flex-col items-center sm:flex-row">
          <div className="flex flex-col items-center">
            <div
              className="flex h-16 w-32 flex-col items-center justify-center rounded-xl border text-center"
              style={{ borderColor: s.color + "60", background: s.color + "15" }}
            >
              <span className="font-data text-[11px] font-bold" style={{ color: s.color }}>{s.label}</span>
              <span className="mt-0.5 text-[10px] text-slate-400">{s.sub}</span>
            </div>
          </div>
          {i < stages.length - 1 && (
            <div className="my-1 text-slate-600 sm:mx-2 sm:my-0 sm:mt-5">→</div>
          )}
        </div>
      ))}
      <div className="flex flex-col items-center sm:flex-row">
        <div className="my-1 text-slate-600 sm:mx-2 sm:my-0 sm:mt-5">→</div>
        <div
          className="flex h-16 w-32 flex-col items-center justify-center rounded-xl border border-dashed text-center"
          style={{ borderColor: "#10b98160", background: "#10b98108" }}
        >
          <span className="font-data text-[11px] font-bold text-emerald-300">Repeat</span>
          <span className="mt-0.5 text-[10px] text-slate-400">Every 45s</span>
        </div>
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ──────────────────────────────────────────────────────

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
          <Link href="/learn" className="font-data text-[11px] text-slate-500 hover:text-emerald-300 transition">
            ← Back to Learn
          </Link>
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

        <div className="space-y-10 text-sm text-slate-300 leading-relaxed">
          {children}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-slate-800 pt-6">
          {prev ? (
            <Link href={prev.href} className="text-xs text-slate-400 hover:text-emerald-300 transition">
              ← {prev.label}
            </Link>
          ) : <div />}
          {next ? (
            <Link href={next.href} className="text-xs text-emerald-300 hover:text-emerald-200 transition">
              {next.label} →
            </Link>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-50">{title}</h2>
      <div className="text-sm text-slate-300 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Callout({ children, color = "emerald" }: { children: React.ReactNode; color?: "emerald" | "purple" }) {
  const c = color === "emerald"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    : "border-purple-500/30 bg-purple-500/10 text-purple-200";
  return (
    <div className={`my-4 rounded-xl border p-4 text-sm ${c}`}>{children}</div>
  );
}

function Step({ n, color, title, children }: { n: string; color: string; title: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    purple: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    orange: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  };
  return (
    <div className={`flex gap-4 rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 font-data text-xs font-bold">{n}</div>
      <div>
        <div className="font-semibold text-slate-50">{title}</div>
        <p className="mt-1 text-xs text-slate-300">{children}</p>
      </div>
    </div>
  );
}

function TermList({ terms }: { terms: { term: string; def: string }[] }) {
  return (
    <dl className="space-y-3">
      {terms.map((t) => (
        <div key={t.term} className="flex gap-3">
          <dt className="w-36 shrink-0 font-data text-xs font-bold text-emerald-300">{t.term}</dt>
          <dd className="text-xs text-slate-300">{t.def}</dd>
        </div>
      ))}
    </dl>
  );
}

function LiveLink({ href, text }: { href: string; text: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
      <Link href={href} className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 transition">
        {text}
      </Link>
    </div>
  );
}
