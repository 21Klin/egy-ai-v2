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
 *   - globally unique lineage ids + parent tracking + origin tags
 *   - rsiLow actually used in the trading rule
 *   - every genome backtested over the same window regardless of
 *     its own slowMa, so fitness is comparable across the population
 *   - a finite fitness floor instead of -Infinity (which silently
 *     corrupted saved snapshots: JSON.stringify(-Infinity) === "null")
 *   - a train/test split so "best fitness" can't just mean "best at
 *     memorizing the data it was scored on"
 *   - population diversity tracking + a few random immigrants each
 *     generation, to fight premature convergence
 *   - a graveyard (every eliminated individual, with a reason) and a
 *     quarantine list (the ones that clearly failed — net loss or too
 *     much drawdown); new children too similar to a quarantined genome
 *     get rejected and re-generated, so the bot doesn't just re-breed
 *     the same mistake it already learned from
 *   - more real history per generation (5-minute candles, paginated up
 *     to 2000 of them — see fetchHistoricalCloses), which measurably
 *     improved how the champion does on unseen data. See the long
 *     comment above buyAndHoldEquity for what was tried and what
 *     genuinely helped versus what didn't (honestly: generalization is
 *     improved, not solved)
 */

export type Genome = {
  fastMa: number;
  slowMa: number;
  rsiPeriod: number;
  rsiLow: number;
  rsiHigh: number;
};

export type Origin = "random" | "crossover" | "mutation" | "elite" | "immigrant";

export type Individual = {
  /** Globally unique across the whole run, e.g. "g14-7" (generation 14, slot 7). Never reused. */
  id: string;
  genome: Genome;
  /** Fitness on the TRAIN window only — never on data used to pick the next generation's winners. */
  fitness: number;
  netEquity: number;
  maxDrawdown: number;
  trades: number;
  /** [] for the very first generation and for immigrants; one id for a mutation-only child; two for crossover; one (itself) for an elite carried over unchanged. */
  parentIds: string[];
  bornGeneration: number;
  origin: Origin;
};

export type GenerationHistoryEntry = {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  worstFitness: number;
  /** The generation's best genome — lets a chart show how each gene changed over time. */
  bestGenome: Genome;
  /** The generation's best genome scored on the UNSEEN test window — never used for selection. */
  testEquity: number;
  /** Buy-and-hold return over that same test window, for comparison. */
  buyAndHoldEquity: number;
  diversity: number;
  blockedCount: number;
};

export type EliminationReason = "lost money" | "drawdown too high" | "outcompeted";

export type GraveyardEntry = {
  id: string;
  genome: Genome;
  /** Post-drawdown-penalty score used for selection — NOT what `reason` is based on; see netEquity/maxDrawdown below for that. */
  fitness: number;
  /** Raw train-window equity (no drawdown penalty applied). `reason === "lost money"` iff this is < 1. */
  netEquity: number;
  /** Train-window peak-to-trough drawdown. `reason === "drawdown too high"` iff this exceeds the threshold. */
  maxDrawdown: number;
  /** Scored on the test window, same as a survivor would be — lets the graveyard answer "would this also have failed on unseen data?" */
  testEquity: number;
  generationDied: number;
  reason: EliminationReason;
};

export type BlockedEvent = {
  generation: number;
  tooSimilarToId: string;
};

export type GenerationSnapshot = {
  generation: number;
  population: Individual[];
  bestEverFitness: number | null;
  bestEverGenome: Genome;
  /** Captured once, at generation 1, and never overwritten — the "Gen 1 vs now" card's other half. */
  firstChampionGenome: Genome | null;
  lastSignal: { action: "buy" | "sell" | "hold"; price: number; time: number } | null;
  log: { time: number; message: string }[];
  history: GenerationHistoryEntry[];
  graveyard: GraveyardEntry[];
  quarantine: GraveyardEntry[];
  repeatsBlockedTotal: number;
  /** Uncapped running totals for the end-of-run report card — graveyard/quarantine above are capped for display/lookup, these never shrink. */
  strategiesCreatedTotal: number;
  eliminatedTotal: number;
  quarantinedTotal: number;
  /** Last ~16 generations' full evaluated populations, for the lineage tree. */
  recentGenerations: { generation: number; population: Individual[] }[];
};

export const POPULATION_SIZE = 24;
export const ELITE_COUNT = 4;
export const IMMIGRANT_COUNT = 3;
const TOURNAMENT_SIZE = 5;
const MUTATION_RATE = 0.25;
const ELEVATED_MUTATION_RATE = 0.5; // used when the population's diversity has collapsed
export const DIVERSITY_FLOOR = 0.08; // below this, raise mutation to fight premature convergence
const TRANSACTION_COST = 0.0010; // 0.10%, matches Binance taker fee
export const TRAIN_RATIO = 0.7;

const DRAWDOWN_FAIL_THRESHOLD = 0.3; // >30% peak-to-trough on the train backtest counts as a clear failure
const MAX_GRAVEYARD_SIZE = 200;
const MAX_QUARANTINE_SIZE = 150;
const MAX_CHILD_RETRIES = 5;
/**
 * How close (normalized genome distance) a new child can be to a quarantined
 * failure before it gets rejected and re-generated.
 *
 * Tuned empirically against an 80-generation offline run (fixed synthetic
 * data, see the task 2 commit). Independently random genome pairs have a
 * median normalized distance of ~0.21 (even the 5th percentile is ~0.11),
 * so anything near that scale blocks almost everything once quarantine has
 * ~100+ entries — an earlier pass at 0.12 blocked 100% of generations,
 * ~100 children per generation (nearly every attempt, every retry). At
 * 0.011, ~65% of generations see at least one block, averaging ~1.3
 * blocks/generation with real quiet stretches in between — close enough to
 * the near-duplicate scale (a small hand-mutated copy of a genome measures
 * ~0.025 away) that it's catching real repeats, not blocking by coincidence.
 */
export const QUARANTINE_SIMILARITY_THRESHOLD = 0.011;

/** Every genome is backtested starting from this same bar index, regardless of its own slowMa,
 *  so two genomes' fitness scores are comparable (neither gets a head start or a shorter window). */
export const MAX_POSSIBLE_SLOW_MA = 24 /* max fastMa */ + 10 + 49 /* max extra in randomGenome */;

/** A finite, sentinel-free floor for genomes that can't be backtested at all (e.g. fastMa >= slowMa, or
 *  not enough candles). -Infinity used to serve this role, but JSON.stringify(-Infinity) === "null",
 *  which silently corrupted every saved snapshot that contained one. */
export const FITNESS_FLOOR = -1;

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
 *
 * Every genome starts its backtest at the SAME bar index
 * (MAX_POSSIBLE_SLOW_MA), not at its own slowMa + 1 — otherwise a
 * genome with a short slowMa gets more bars to trade (and more
 * chances to compound) than one with a long slowMa, which isn't a
 * fair comparison for fitness/selection purposes.
 */
export function evaluateGenome(genome: Genome, closes: number[]): { fitness: number; netEquity: number; maxDrawdown: number; trades: number; lastPosition: -1 | 0 | 1 } {
  if (genome.fastMa >= genome.slowMa || closes.length < MAX_POSSIBLE_SLOW_MA + 5) {
    return { fitness: FITNESS_FLOOR, netEquity: 1, maxDrawdown: 0, trades: 0, lastPosition: 0 };
  }

  const fast = sma(closes, genome.fastMa);
  const slow = sma(closes, genome.slowMa);
  const rsiVals = rsi(closes, genome.rsiPeriod);

  let position: -1 | 0 | 1 = 0;
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let trades = 0;

  for (let i = MAX_POSSIBLE_SLOW_MA; i < closes.length; i++) {
    if (Number.isNaN(fast[i]) || Number.isNaN(slow[i]) || Number.isNaN(rsiVals[i])) continue;

    // rsiLow gates BOTH directions: a long only counts when RSI is between
    // rsiLow and rsiHigh (confirms real bullish strength, not a blip inside
    // a hard sell-off), and a short is avoided once RSI has already fallen
    // below rsiLow (don't pile on more downside into an already-oversold
    // market — that's where trend-followers most often get caught by a
    // sharp reversal).
    const longSignal = fast[i] > slow[i] && rsiVals[i] > genome.rsiLow && rsiVals[i] < genome.rsiHigh;
    const shortSignal = fast[i] < slow[i] && rsiVals[i] > genome.rsiLow;

    const prevPosition: -1 | 0 | 1 = position;
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
  const fitness = Math.max(FITNESS_FLOOR, equity - drawdownPenalty);

  return { fitness, netEquity: equity, maxDrawdown, trades, lastPosition: position };
}

/**
 * GENERALIZATION — an honest note, not a solved problem.
 *
 * A first attempt here split the train window into 4 sub-windows and
 * averaged fitness across them, on the theory that a genome overfitting one
 * lucky stretch would score worse than one holding up across several. Tested
 * properly (8 seeded trials, both the synthetic data AND the GA's own
 * randomness reproducible, isolating each variable): it did NOT help. At the
 * same candle count, single-window and 4-window selection produced
 * statistically indistinguishable "does train fitness predict test rank"
 * results (avg champion rank ~7-10th of 24 either way; an eliminated
 * non-champion beat the champion's test equity in ~95% of checkpoints
 * under BOTH). It was reverted — a change that adds real computational cost
 * and complexity with no measured benefit isn't worth shipping.
 *
 * The one lever that did reliably help: more total history. The old default
 * (1000 1-minute candles = 16.7 hours, split 70/30) gave genomes with
 * slowMa up to ~160 bars barely enough room for one real crossover signal;
 * champions came out flat-to-negative on unseen data and lost to
 * buy-and-hold in 8/8 seeded trials. Candles are now 5-minute, 2000 of
 * them (~1 week) — see fetchHistoricalCloses — which reliably beat
 * buy-and-hold in 8/8 trials instead.
 *
 * But that is NOT the same as solving selection quality: with more history,
 * the "eliminated beats champion" rate was still ~95-96%, same as before.
 * Picking the single best-train-fitness genome each generation remains a
 * weak predictor of which genome will do best on data it hasn't seen — a
 * harder problem than a fitness-function tweak fixes. A smaller drawdown
 * penalty (tested at 0.5x instead of 2.0x) showed a marginally better
 * average rank (6.5 vs 6.8) but within the noise across seeds, so it was
 * left unchanged rather than ship a change the data doesn't clearly support.
 */

/** Buy-and-hold equity over the same closes, for comparison against the bot. */
export function buyAndHoldEquity(closes: number[]): number {
  if (closes.length < 2 || closes[0] <= 0) return 1;
  return closes[closes.length - 1] / closes[0];
}

/** Chronological 70/30 split: the GA only ever evolves on `train`; `test` is
 *  never used for selection, only to report how the champion does on data
 *  it has never seen. */
export function splitTrainTest(closes: number[], trainRatio = TRAIN_RATIO): { train: number[]; test: number[] } {
  const cut = Math.floor(closes.length * trainRatio);
  return { train: closes.slice(0, cut), test: closes.slice(cut) };
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

function mutate(g: Genome, mutationRate: number = MUTATION_RATE): Genome {
  const mutated = { ...g };
  if (Math.random() < mutationRate) mutated.fastMa = Math.max(3, mutated.fastMa + Math.floor(Math.random() * 11 - 5));
  if (Math.random() < mutationRate) mutated.slowMa = Math.max(mutated.fastMa + 5, mutated.slowMa + Math.floor(Math.random() * 21 - 10));
  if (Math.random() < mutationRate) mutated.rsiPeriod = Math.min(30, Math.max(5, mutated.rsiPeriod + Math.floor(Math.random() * 5 - 2)));
  if (Math.random() < mutationRate) mutated.rsiLow = Math.min(45, Math.max(10, mutated.rsiLow + Math.floor(Math.random() * 5 - 2)));
  if (Math.random() < mutationRate) mutated.rsiHigh = Math.min(90, Math.max(55, mutated.rsiHigh + Math.floor(Math.random() * 5 - 2)));
  return mutated;
}

// Roughly the actual range each gene can take across randomGenome() + drift
// from mutation, used only to normalize distances for diversity tracking.
const GENE_RANGES: Record<keyof Genome, [number, number]> = {
  fastMa: [3, 60],
  slowMa: [10, 160],
  rsiPeriod: [5, 30],
  rsiLow: [10, 45],
  rsiHigh: [55, 90],
};

function normalizedDistance(a: Genome, b: Genome): number {
  const keys = Object.keys(GENE_RANGES) as (keyof Genome)[];
  let sumSq = 0;
  for (const key of keys) {
    const [lo, hi] = GENE_RANGES[key];
    const range = hi - lo || 1;
    const diff = (a[key] - b[key]) / range;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / keys.length);
}

/** Average pairwise normalized genome distance across the population — a proxy for
 *  how converged (low) or spread out (high) the gene pool currently is. */
export function populationDiversity(population: Individual[]): number {
  if (population.length < 2) return 0;
  let total = 0;
  let count = 0;
  for (let i = 0; i < population.length; i++) {
    for (let j = i + 1; j < population.length; j++) {
      total += normalizedDistance(population[i].genome, population[j].genome);
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

/** Why an individual didn't make it to the next generation. */
function classifyElimination(ind: Individual): EliminationReason {
  if (ind.maxDrawdown > DRAWDOWN_FAIL_THRESHOLD) return "drawdown too high";
  if (ind.netEquity < 1) return "lost money";
  return "outcompeted";
}

/** The closest quarantined genome to a candidate, if any exist. */
function nearestQuarantineMatch(genome: Genome, quarantine: GraveyardEntry[]): { entry: GraveyardEntry; distance: number } | null {
  let nearest: GraveyardEntry | null = null;
  let nearestDist = Infinity;
  for (const q of quarantine) {
    const d = normalizedDistance(genome, q.genome);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = q;
    }
  }
  return nearest ? { entry: nearest, distance: nearestDist } : null;
}

function freshIndividual(id: string, genome: Genome, bornGeneration: number, origin: Origin, parentIds: string[]): Individual {
  return { id, genome, fitness: 0, netEquity: 1, maxDrawdown: 0, trades: 0, parentIds, bornGeneration, origin };
}

export function initialPopulation(): Individual[] {
  return Array.from({ length: POPULATION_SIZE }, (_, i) => freshIndividual(`g0-${i}`, randomGenome(), 0, "random", []));
}

/**
 * Runs ONE full generation: evaluate every individual against the TRAIN
 * window, archive everyone who doesn't survive into the graveyard (and,
 * if they clearly failed, the quarantine list too), then produce the next
 * generation via elitism + a few random immigrants + tournament selection +
 * crossover/mutation — rejecting and re-generating any child that's too
 * similar to a quarantined failure, so the bot doesn't just re-breed the
 * same mistake it already learned from. Separately scores the generation's
 * best genome against the TEST window (never used for selection) and
 * against buy-and-hold, so a learning curve can show whether the bot is
 * actually getting better at unseen data, not just memorizing the train
 * window.
 */
export function evolveGeneration(
  population: Individual[],
  trainCloses: number[],
  testCloses: number[],
  currentPrice: number,
  generation: number,
  graveyard: GraveyardEntry[],
  quarantine: GraveyardEntry[]
): {
  nextPopulation: Individual[];
  best: Individual;
  signal: { action: "buy" | "sell" | "hold"; price: number };
  historyEntry: GenerationHistoryEntry;
  graveyard: GraveyardEntry[];
  quarantine: GraveyardEntry[];
  blockedEvents: BlockedEvent[];
  /** Just this generation's fresh eliminations (a subset of the returned `graveyard`), for a per-generation audit record. */
  eliminatedThisGeneration: GraveyardEntry[];
  /** This generation's full evaluated population (real fitness, not the unevaluated children in `nextPopulation`) — a lineage tree needs each generation's actual members, not just the survivors. */
  evaluatedPopulation: Individual[];
} {
  const evaluated: Individual[] = population.map((ind) => {
    const result = evaluateGenome(ind.genome, trainCloses);
    return { ...ind, fitness: result.fitness, netEquity: result.netEquity, maxDrawdown: result.maxDrawdown, trades: result.trades };
  });

  evaluated.sort((a, b) => b.fitness - a.fitness);
  const best = evaluated[0];
  const worst = evaluated[evaluated.length - 1];
  const avgFitness = evaluated.reduce((sum, ind) => sum + ind.fitness, 0) / evaluated.length;

  const bestEval = evaluateGenome(best.genome, trainCloses);
  const action: "buy" | "sell" | "hold" = bestEval.lastPosition === 1 ? "buy" : bestEval.lastPosition === -1 ? "sell" : "hold";

  const testResult = evaluateGenome(best.genome, testCloses);
  const diversity = populationDiversity(evaluated);
  const mutationRate = diversity < DIVERSITY_FLOOR ? ELEVATED_MUTATION_RATE : MUTATION_RATE;

  const nextGen = generation + 1;

  // ── Archive everyone who doesn't survive as an elite ────────────────────
  const eliminated = evaluated.slice(ELITE_COUNT);
  const newGraveyardEntries: GraveyardEntry[] = eliminated.map((ind) => ({
    id: ind.id,
    genome: ind.genome,
    fitness: ind.fitness,
    netEquity: ind.netEquity,
    maxDrawdown: ind.maxDrawdown,
    testEquity: evaluateGenome(ind.genome, testCloses).netEquity,
    generationDied: generation,
    reason: classifyElimination(ind),
  }));
  const nextGraveyard = [...graveyard, ...newGraveyardEntries].slice(-MAX_GRAVEYARD_SIZE);
  const newQuarantineEntries = newGraveyardEntries.filter((e) => e.reason !== "outcompeted");
  const nextQuarantine = [...quarantine, ...newQuarantineEntries].slice(-MAX_QUARANTINE_SIZE);

  // ── Build the next population ───────────────────────────────────────────
  const next: Individual[] = evaluated.slice(0, ELITE_COUNT).map((ind, i) =>
    freshIndividual(`g${nextGen}-${i}`, ind.genome, nextGen, "elite", [ind.id])
  );

  for (let i = 0; i < IMMIGRANT_COUNT && next.length < POPULATION_SIZE; i++) {
    next.push(freshIndividual(`g${nextGen}-${next.length}`, randomGenome(), nextGen, "immigrant", []));
  }

  const blockedEvents: BlockedEvent[] = [];

  while (next.length < POPULATION_SIZE) {
    const id = `g${nextGen}-${next.length}`;
    let placed = false;

    for (let attempt = 0; attempt <= MAX_CHILD_RETRIES && !placed; attempt++) {
      const useMutationOnly = Math.random() < 0.3;
      const parent = useMutationOnly ? tournamentPick(evaluated) : null;
      const parentA = useMutationOnly ? null : tournamentPick(evaluated);
      const parentB = useMutationOnly ? null : tournamentPick(evaluated);
      const candidateGenome = useMutationOnly
        ? mutate(parent!.genome, mutationRate)
        : mutate(crossover(parentA!.genome, parentB!.genome), mutationRate);

      const match = nextQuarantine.length > 0 ? nearestQuarantineMatch(candidateGenome, nextQuarantine) : null;
      const tooSimilar = match !== null && match.distance < QUARANTINE_SIMILARITY_THRESHOLD;

      if (tooSimilar) {
        blockedEvents.push({ generation: nextGen, tooSimilarToId: match!.entry.id });
        if (attempt === MAX_CHILD_RETRIES) {
          // Exhausted retries — fall back to a fresh random immigrant (not
          // quarantine-checked) so the population always reaches full size.
          next.push(freshIndividual(id, randomGenome(), nextGen, "immigrant", []));
          placed = true;
        }
        continue;
      }

      next.push(
        useMutationOnly
          ? freshIndividual(id, candidateGenome, nextGen, "mutation", [parent!.id])
          : freshIndividual(id, candidateGenome, nextGen, "crossover", [parentA!.id, parentB!.id])
      );
      placed = true;
    }
  }

  const historyEntry: GenerationHistoryEntry = {
    generation: nextGen,
    bestFitness: best.fitness,
    avgFitness,
    worstFitness: worst.fitness,
    bestGenome: best.genome,
    testEquity: testResult.netEquity,
    buyAndHoldEquity: buyAndHoldEquity(testCloses),
    diversity,
    blockedCount: blockedEvents.length,
  };

  return {
    nextPopulation: next,
    best,
    signal: { action, price: currentPrice },
    historyEntry,
    graveyard: nextGraveyard,
    quarantine: nextQuarantine,
    blockedEvents,
    eliminatedThisGeneration: newGraveyardEntries,
    evaluatedPopulation: evaluated,
  };
}

const STORAGE_PREFIX = "egy_ga_snapshot_v1";

/**
 * Snapshots are namespaced by account (uid, or "guest") so switching
 * accounts in the same browser never shows one account's bot state
 * (population, generation, log) to another.
 */
export function saveSnapshot(snapshot: GenerationSnapshot, owner: string = "guest") {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${owner}`, JSON.stringify(snapshot));
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

export function loadSnapshot(owner: string = "guest"): GenerationSnapshot | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${owner}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const BINANCE_MAX_PER_REQUEST = 1000;

/**
 * Fetches `totalLimit` closes, paginating backward in time since Binance
 * caps a single klines request at 1000. Defaults to 5m candles (was 1m) —
 * 2000 candles at 5m covers ~6.9 days of real market time instead of ~16.7
 * hours, which is what actually made the difference in the generalization
 * test above (see FITNESS_WINDOW_COUNT): with only 1000 1m candles split
 * 70/30, train/test are a few hundred bars each — thin enough that a GA can
 * find a "pattern" that's really just that window's specific noise.
 */
export async function fetchHistoricalCloses(totalLimit = 2000, interval = "5m"): Promise<number[]> {
  const closes: number[] = [];
  let endTime: number | undefined;

  while (closes.length < totalLimit) {
    const batchLimit = Math.min(BINANCE_MAX_PER_REQUEST, totalLimit - closes.length);
    const url =
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${batchLimit}` +
      (endTime !== undefined ? `&endTime=${endTime}` : "");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance klines request failed (${res.status})`);
    const data: any[][] = await res.json();
    if (data.length === 0) break;

    closes.unshift(...data.map((k) => parseFloat(k[4])));
    endTime = data[0][0] - 1; // next (older) page ends right before this page's earliest candle
    if (data.length < batchLimit) break; // Binance had no more history to give
  }

  return closes.slice(-totalLimit);
}
