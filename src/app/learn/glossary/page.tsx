import Link from "next/link";

const terms = [
  { term: "Algorithm", def: "A set of rules or steps a computer follows to solve a problem or make a decision.", category: "General" },
  { term: "Algorithmic trading", def: "Using computer programs to execute trades automatically based on predefined rules or learned strategies.", category: "Trading" },
  { term: "Ask", def: "The lowest price a seller is willing to accept right now. Also called the offer.", category: "Trading" },
  { term: "Backtest", def: "Testing a trading strategy on historical data to see how it would have performed in the past.", category: "Trading" },
  { term: "Bid", def: "The highest price a buyer is willing to pay right now.", category: "Trading" },
  { term: "BTC", def: "Bitcoin. The world's first and most traded cryptocurrency.", category: "Crypto" },
  { term: "Candle / Kline", def: "A data point summarising price movement over a time period — open, high, low, close, and volume.", category: "Trading" },
  { term: "Chromosome", def: "Another word for genome in genetic algorithms — the full set of parameters describing one individual.", category: "GA" },
  { term: "Circuit breaker", def: "An automatic rule that pauses trading when losses exceed a threshold. EGY-AI uses an 8% session stop-loss.", category: "Risk" },
  { term: "Crossover", def: "In a genetic algorithm, combining two parent individuals to create a child that inherits traits from both.", category: "GA" },
  { term: "Depth", def: "The volume of orders waiting at each price level in the order book. More depth = more liquidity.", category: "Trading" },
  { term: "Drawdown", def: "The percentage drop from a portfolio's peak value to its lowest point. A key risk metric.", category: "Risk" },
  { term: "Elite / Elitism", def: "In a genetic algorithm, keeping the best individuals unchanged in the next generation so good solutions are never lost.", category: "GA" },
  { term: "Evolution cycle", def: "One complete generation in a genetic algorithm: evaluate → select → crossover → mutate → repeat.", category: "GA" },
  { term: "Fitness function", def: "The formula used to score how good an individual is. EGY-AI's fitness penalises drawdown and fees.", category: "GA" },
  { term: "Genome / Individual", def: "One candidate solution in a genetic algorithm. In EGY-AI, a specific set of strategy parameters.", category: "GA" },
  { term: "Generation", def: "One complete cycle of a genetic algorithm. EGY-AI runs one generation every 45 seconds.", category: "GA" },
  { term: "Genetic Algorithm (GA)", def: "An optimisation technique inspired by biological evolution. Evolves a population of solutions toward better performance.", category: "GA" },
  { term: "Leverage", def: "Borrowing to amplify your position size. 2x leverage means you control twice as much as you put in — gains and losses are both doubled.", category: "Trading" },
  { term: "Liquidity", def: "How easily an asset can be bought or sold without significantly moving its price.", category: "Trading" },
  { term: "Long", def: "A position that profits when the price goes up. 'Going long' means buying.", category: "Trading" },
  { term: "Moving Average (MA)", def: "The average price over a recent window of candles. Smooths out noise to show trend direction.", category: "Indicators" },
  { term: "Momentum", def: "The speed and strength of recent price movement. RSI measures momentum.", category: "Indicators" },
  { term: "Mutation", def: "Randomly changing part of an individual's genome to introduce new variation and prevent stagnation.", category: "GA" },
  { term: "Next.js", def: "The web framework EGY-AI is built on. A React-based framework for building production web applications.", category: "Tech" },
  { term: "Order book", def: "A live list of all buy and sell orders waiting to be matched on an exchange.", category: "Trading" },
  { term: "Overbought", def: "RSI above 70 — the asset has been rising strongly, potential reversal zone.", category: "Indicators" },
  { term: "Oversold", def: "RSI below 30 — the asset has been falling strongly, potential bounce zone.", category: "Indicators" },
  { term: "P&L", def: "Profit and Loss. The net gain or loss from your trading activity.", category: "Trading" },
  { term: "Population", def: "In a genetic algorithm, the group of candidate solutions being evolved simultaneously.", category: "GA" },
  { term: "RSI", def: "Relative Strength Index. A 0–100 momentum indicator measuring the speed of recent price changes.", category: "Indicators" },
  { term: "Selection", def: "Choosing which individuals reproduce. EGY-AI uses tournament selection.", category: "GA" },
  { term: "Short", def: "A position that profits when the price goes down. 'Going short' means selling what you don't own.", category: "Trading" },
  { term: "Simulator", def: "EGY-AI is a trading simulator — real market data, but no real money.", category: "General" },
  { term: "Slippage", def: "The difference between expected trade price and actual fill price, caused by fast market movement.", category: "Trading" },
  { term: "Spread", def: "The gap between best bid and best ask. Smaller spread = more liquid market.", category: "Trading" },
  { term: "Stop-loss", def: "A rule that closes a position or pauses trading when losses hit a set limit.", category: "Risk" },
  { term: "Tournament selection", def: "A selection method where a small random group competes and the best one wins — used in EGY-AI's GA.", category: "GA" },
  { term: "USDT", def: "A stablecoin pegged 1:1 to the US Dollar. Used as the quote currency in BTC/USDT.", category: "Crypto" },
  { term: "Volatility", def: "How much and how fast a price moves. High volatility = large price swings in short time.", category: "Trading" },
  { term: "WebSocket", def: "A real-time communication protocol. EGY-AI uses it to receive live Binance data with minimal delay.", category: "Tech" },
  { term: "Zustand", def: "The state management library EGY-AI uses. Manages shared data (price, balances, GA state) across all components.", category: "Tech" },
];

const categories = ["All", "GA", "Trading", "Indicators", "Risk", "Crypto", "Tech", "General"];

export default function GlossaryPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2">
          <Link href="/learn" className="font-data text-[11px] text-slate-500 hover:text-emerald-300 transition">
            ← Back to Learn
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">📚</span>
            <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 font-data text-[10px] text-slate-300">Reference</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Glossary</h1>
          <p className="mt-2 text-slate-400">Every technical term used across EGY-AI, explained in plain language.</p>
        </div>

        {/* CATEGORY FILTERS — static, no JS needed */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span key={cat} className="rounded-full border border-slate-700 bg-slate-800/40 px-3 py-1 font-data text-[10px] text-slate-400">
              {cat}
            </span>
          ))}
        </div>

        {/* TERMS A-Z */}
        <div className="space-y-2">
          {terms.sort((a, b) => a.term.localeCompare(b.term)).map((t) => {
            const catColor: Record<string, string> = {
              GA: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
              Trading: "text-blue-300 bg-blue-500/10 border-blue-500/30",
              Indicators: "text-purple-300 bg-purple-500/10 border-purple-500/30",
              Risk: "text-red-300 bg-red-500/10 border-red-500/30",
              Crypto: "text-orange-300 bg-orange-500/10 border-orange-500/30",
              Tech: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
              General: "text-slate-300 bg-slate-500/10 border-slate-500/30",
            };
            return (
              <div key={t.term} className="flex gap-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="w-44 shrink-0">
                  <div className="font-data text-sm font-bold text-slate-100">{t.term}</div>
                  <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 font-data text-[9px] ${catColor[t.category] || catColor.General}`}>
                    {t.category}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{t.def}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-slate-800 pt-6">
          <Link href="/learn/how-egy-ai-works" className="text-xs text-slate-400 hover:text-emerald-300 transition">
            ← How EGY-AI Works
          </Link>
          <Link href="/learn" className="text-xs text-emerald-300 hover:text-emerald-200 transition">
            Back to Learn hub →
          </Link>
        </div>
      </div>
    </div>
  );
}
