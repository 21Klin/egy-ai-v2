export default function AboutPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-10">
        <section>
          <p className="font-data text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
            About the project
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            A low-latency Bitcoin trading bot, built by students, designed for
            students.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
            This project is a student-built Bitcoin trading bot created for a
            competition. Instead of hiding everything behind a black box, we
            focused on clear structure: live data, an evolving strategy, a
            transparent UI, and a full trade history.
          </p>
        </section>

        <section className="grid gap-8 md:grid-cols-[1.4fr,1fr]">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <h2 className="text-lg font-semibold text-slate-50">How the bot works</h2>
            <p className="text-sm text-slate-300">
              Our system uses a <span className="text-emerald-300 font-semibold">Genetic Algorithm (GA)</span>,
              an optimization method inspired by evolution. Instead of following fixed rules,
              the bot learns from experience, adapts to conditions, and evolves toward smarter decisions.
            </p>

            <ol className="space-y-4 text-sm text-slate-200">
              <Step n={1} title="Population of strategies" body="The bot generates multiple strategy variants, each with different moving-average periods, RSI thresholds, and risk parameters." />
              <Step n={2} title="Fitness evaluation" body="Each strategy is backtested against real market data. We score on net profit after fees, drawdown, and consistency — not raw profit alone." />
              <Step n={3} title="Crossover + mutation" body="The top strategies breed new ones by mixing parameters, and mutation introduces new variations so the bot can discover patterns it hasn't tried yet." />
              <Step n={4} title="Evolution over time" body="Over many generations, the bot learns what works and adapts automatically." />
            </ol>

            <div className="mt-8 space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                <h3 className="mb-3 text-lg font-semibold text-slate-50">Engine specifications</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li><span className="text-slate-400">Market data:</span> Binance BTC/USDT WebSocket + REST</li>
                  <li><span className="text-slate-400">Strategy model:</span> Genetic Algorithm, evolving every generation</li>
                  <li><span className="text-slate-400">Population size:</span> 24 individuals per generation</li>
                  <li><span className="text-slate-400">Fitness function:</span> Net equity, fee-adjusted, drawdown-penalized</li>
                  <li><span className="text-slate-400">Execution mode:</span> Simulated spot positions (no real funds)</li>
                  <li><span className="text-slate-400">Platform stack:</span> Next.js, Zustand, TradingView, WebSockets</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <InfoCard title="Why we built it">
              Our goal isn&apos;t to promise perfect profits. Our goal is to show
              that we understand how to design a real trading system: data,
              logic, risk management, and UI working together transparently.
            </InfoCard>
            <InfoCard title="About our team">
              We&apos;re three young engineers building trading software from
              scratch — live feeds, strategy logic, quantitative design, UX,
              and software architecture.
            </InfoCard>
            <InfoCard title="Mission statement">
              Build transparent, educational, high-performance trading
              technology that helps students understand real market structure
              through live data and intelligent automation.
            </InfoCard>
            <InfoCard title="Our values">
              <ul className="space-y-2">
                <li>• Transparency over hype</li>
                <li>• Learning through real data</li>
                <li>• Engineering before shortcuts</li>
                <li>• Curiosity and experimentation</li>
              </ul>
            </InfoCard>
          </div>
        </section>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <div className="h-6 w-6 flex items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-emerald-300">
        {n}
      </div>
      <div>
        <div className="font-semibold text-slate-50">{title}</div>
        <p className="text-xs text-slate-300">{body}</p>
      </div>
    </li>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <h2 className="text-sm font-semibold text-slate-50">{title}</h2>
      <div className="mt-2 text-xs text-slate-300">{children}</div>
    </div>
  );
}
