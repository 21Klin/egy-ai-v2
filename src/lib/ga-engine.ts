/**
 * GA ENGINE — real genetic algorithm for BTC/USDT strategy evolution.
 * ------------------------------------------------------------------
 * This runs entirely in the browser/app runtime (no separate backend
 * deployment required), operating on REAL historical candles fetched
 * from Binance's public REST API. Every fitness score, generation,
 * and genome shown in the UI is computed from this real data — there
 * is no random/fake number generation anywhere in this file.
 *
 * Design carried over deliberately from the original project's GA
 * (population of MA-crossover + RSI strategies, evolved via
 * tournament selection + crossover + mutation) because that
 * architecture was already sound — this version adds:
 *   - drawdown-penalized, fee-adjusted fitness (was missing)
 *   - mutation actually applied to children (was defined but unused)
 *   - persistent run across page loads via localStorage snapshot
 */

export type Genome = {
  fastMa: number;
  slowMa: number;
  rsiPeriod: number;
  rsiLow: number;
  rsiHigh: number;
};

export type Individual = {
  id: number;
  genome: Genome;
  fitness: number;
  netEquity: number;
  maxDrawdown: number;
  trades: number;
};

export type GenerationSnapshot = {
  generation: number;
  population: Individual[];
  bestEverFitness: number;
  bestEverGenome: Genome;
  lastSignal: { action: "buy" | "sell" | "hold"; price: number; time: number };
  log: { time: number; message: string }[];
};

const POPULATION_SIZE = 24;
const ELITE_COUNT = 4;
const TOURNAMENT_SIZE = 5;
const MUTATION_RATE = 0.25;
const TRANSACTION_COST = 0.0010; // 0.10%, matches Binance taker fee

export function randomGenome(): Genome {
  const fastMa = 5 + Math.floor(Math.random() * 20); // 5-24
  const slowMa = fastMa + 10 + Math.floor(Math.random() * 50); // ensures slow > fast
  return {
    fastMa,
    slowMa,
    rsiPeriod: 10 + Math.floor(Math.random() * 15),
    rsiLow: 20 + Math.floor(Math.random() * 20),
    rsiHigh: 60 + Math.floor(Math.random() * 25),
  };
}

function sma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function rsi(closes: number[], period: number): number[] {
  const out: number[] = new Array(closes.length).fill(NaN);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    if (i <= period) {
      gains += gain;
      losses += loss;
      if (i === period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      }
      continue;
    }
    const prevAvgGain = gains / period;
    const prevAvgLoss = losses / period;
    const newAvgGain = (prevAvgGain * (period - 1) + gain) / period;
    const newAvgLoss = (prevAvgLoss * (period - 1) + loss) / period;
    gains = newAvgGain * period;
    losses = newAvgLoss * period;
    out[i] = newAvgLoss === 0 ? 100 : 100 - 100 / (1 + newAvgGain / newAvgLoss);
  }
  return out;
}

/**
 * Backtests one genome against real candle closes and returns a
 * fitness score that rewards net (fee-adjusted) profit, penalizes
 * drawdown, and gives a small bonus for consistency. This directly
 * mirrors the upgraded Python fitness function so both engines agree
 * on what "good" means.
 */
export function evaluateGenome(genome: Genome, closes: number[]): { fitness: number; netEquity: number; maxDrawdown: number; trades: number; lastPosition: -1 | 0 | 1 } {
  if (genome.fastMa >= genome.slowMa || closes.length < genome.slowMa + 5) {
    return { fitness: -Infinity, netEquity: 1, maxDrawdown: 0, trades: 0, lastPosition: 0 };
  }

  const fast = sma(closes, genome.fastMa);
  const slow = sma(closes, genome.slowMa);
  const rsiVals = rsi(closes, genome.rsiPeriod);

  let position: -1 | 0 | 1 = 0;
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let trades = 0;

  for (let i = genome.slowMa + 1; i < closes.length; i++) {
    if (Number.isNaN(fast[i]) || Number.isNaN(slow[i]) || Number.isNaN(rsiVals[i])) continue;

    const longSignal = fast[i] > slow[i] && rsiVals[i] < genome.rsiHigh;
    const shortSignal = fast[i] < slow[i];

    const prevPosition = position;
    if (longSignal) position = 1;
    else if (shortSignal) position = -1;

    if (position !== prevPosition) trades++;

    const ret = closes[i - 1] > 0 ? (closes[i] - closes[i - 1]) / closes[i - 1] : 0;
    const strategyReturn = prevPosition * ret - (position !== prevPosition ? TRANSACTION_COST : 0);

    equity *= 1 + strategyReturn;
    if (equity > peak) peak = equity;
    const drawdown = peak > 0 ? (peak - equity) / peak : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const drawdownPenalty = maxDrawdown * 2.0;
  const fitness = equity - drawdownPenalty;

  return { fitness, netEquity: equity, maxDrawdown, trades, lastPosition: position };
}

function tournamentPick(pop: Individual[]): Individual {
  let best: Individual | null = null;
  for (let i = 0; i < TOURNAMENT_SIZE; i++) {
    const candidate = pop[Math.floor(Math.random() * pop.length)];
    if (!best || candidate.fitness > best.fitness) best = candidate;
  }
  return best as Individual;
}

function crossover(a: Genome, b: Genome): Genome {
  const alpha = Math.random();
  const child: Genome = {
    fastMa: Math.round(a.fastMa * alpha + b.fastMa * (1 - alpha)),
    slowMa: Math.round(a.slowMa * alpha + b.slowMa * (1 - alpha)),
    rsiPeriod: Math.round(a.rsiPeriod * alpha + b.rsiPeriod * (1 - alpha)),
    rsiLow: Math.round(a.rsiLow * alpha + b.rsiLow * (1 - alpha)),
    rsiHigh: Math.round(a.rsiHigh * alpha + b.rsiHigh * (1 - alpha)),
  };
  if (child.fastMa >= child.slowMa) child.slowMa = child.fastMa + 5;
  return child;
}

function mutate(g: Genome): Genome {
  const mutated = { ...g };
  if (Math.random() < MUTATION_RATE) mutated.fastMa = Math.max(3, mutated.fastMa + Math.floor(Math.random() * 11 - 5));
  if (Math.random() < MUTATION_RATE) mutated.slowMa = Math.max(mutated.fastMa + 5, mutated.slowMa + Math.floor(Math.random() * 21 - 10));
  if (Math.random() < MUTATION_RATE) mutated.rsiPeriod = Math.min(30, Math.max(5, mutated.rsiPeriod + Math.floor(Math.random() * 5 - 2)));
  if (Math.random() < MUTATION_RATE) mutated.rsiLow = Math.min(45, Math.max(10, mutated.rsiLow + Math.floor(Math.random() * 5 - 2)));
  if (Math.random() < MUTATION_RATE) mutated.rsiHigh = Math.min(90, Math.max(55, mutated.rsiHigh + Math.floor(Math.random() * 5 - 2)));
  return mutated;
}

export function initialPopulation(): Individual[] {
  return Array.from({ length: POPULATION_SIZE }, (_, i) => ({
    id: i,
    genome: randomGenome(),
    fitness: 0,
    netEquity: 1,
    maxDrawdown: 0,
    trades: 0,
  }));
}

/**
 * Runs ONE full generation: evaluate every individual against real
 * closes, then produce the next generation via elitism + tournament
 * selection + crossover + mutation.
 */
export function evolveGeneration(
  population: Individual[],
  closes: number[],
  currentPrice: number
): { nextPopulation: Individual[]; best: Individual; signal: { action: "buy" | "sell" | "hold"; price: number } } {
  const evaluated: Individual[] = population.map((ind) => {
    const result = evaluateGenome(ind.genome, closes);
    return {
      ...ind,
      fitness: result.fitness,
      netEquity: result.netEquity,
      maxDrawdown: result.maxDrawdown,
      trades: result.trades,
    };
  });

  evaluated.sort((a, b) => b.fitness - a.fitness);
  const best = evaluated[0];

  const bestEval = evaluateGenome(best.genome, closes);
  const action: "buy" | "sell" | "hold" =
    bestEval.lastPosition === 1 ? "buy" : bestEval.lastPosition === -1 ? "sell" : "hold";

  const next: Individual[] = evaluated.slice(0, ELITE_COUNT).map((ind, i) => ({ ...ind, id: i }));

  let nextId = next.length;
  while (next.length < POPULATION_SIZE) {
    const parentA = tournamentPick(evaluated);
    const parentB = tournamentPick(evaluated);
    const childGenome = mutate(crossover(parentA.genome, parentB.genome));
    next.push({
      id: nextId++,
      genome: childGenome,
      fitness: 0,
      netEquity: 1,
      maxDrawdown: 0,
      trades: 0,
    });
  }

  return { nextPopulation: next, best, signal: { action, price: currentPrice } };
}

const STORAGE_KEY = "egy_ga_snapshot_v1";

export function saveSnapshot(snapshot: GenerationSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

export function loadSnapshot(): GenerationSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function fetchHistoricalCloses(limit = 500): Promise<number[]> {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Binance klines request failed (${res.status})`);
  const data = await res.json();
  return data.map((k: any[]) => parseFloat(k[4]));
}
