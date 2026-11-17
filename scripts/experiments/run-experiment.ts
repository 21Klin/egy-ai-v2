/**
 * Runs the full EXPERIMENTS.md design using the REAL engine
 * (src/lib/ga-engine.ts) — nothing about the GA logic is reimplemented.
 *
 * Main experiment: 3 mutation rates x 9 regime windows x 10 seeds x
 * 50 generations = 270 runs.
 * Crash stress test: 3 mutation rates x 3 crash windows x 10 seeds x
 * 50 generations = 90 runs, tagged regime="crash" so the analysis step
 * can report them separately (never mixed into the main averages).
 *
 * Each (window, seed) pair uses the SAME seed across all three mutation
 * rates — same starting population, only mutation rate differs — so the
 * paired statistical tests in EXPERIMENTS.md compare like-for-like.
 *
 * Math.random() is swapped for a seeded PRNG (mulberry32) for the
 * duration of each run only, then restored — every run is independently
 * reproducible from its (window_id, mutation_rate, seed).
 *
 * Run: npx tsx scripts/experiments/run-experiment.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import {
  initialPopulation,
  evolveGeneration,
  evaluateGenome,
  splitTrainTest,
  buyAndHoldEquity,
  MUTATION_RATE,
  TRAIN_RATIO,
  type Genome,
  type ClosedTrade,
  type GraveyardEntry,
} from "../../src/lib/ga-engine";
import { toCsv } from "./csv";

const DATA_DIR = path.resolve(process.cwd(), "experiments/output/data");
const OUT_DIR = path.resolve(process.cwd(), "experiments/output");
const GENERATIONS = 50;
const SEEDS = 10;

// "moderate" reads the actual live default straight from the engine, so it
// can never silently drift from what the real site runs.
const MUTATION_RATES: Record<string, number> = { low: 0.05, moderate: MUTATION_RATE, high: 0.6 };

type WindowMeta = {
  id: string;
  regime: "uptrend" | "downtrend" | "sideways" | "crash";
  returnPct: number;
  startDate: string;
  endDate: string;
};

type LoadedWindow = WindowMeta & { closes: number[]; times: number[] };

function loadWindow(meta: WindowMeta): LoadedWindow {
  const csv = readFileSync(path.join(DATA_DIR, `window_${meta.id}.csv`), "utf8");
  const lines = csv.trim().split("\n").slice(1);
  const times: number[] = [];
  const closes: number[] = [];
  for (const line of lines) {
    const cols = line.split(",");
    times.push(new Date(cols[1]).getTime()); // open_time_utc
    closes.push(parseFloat(cols[6])); // close
  }
  return { ...meta, closes, times };
}

/** mulberry32 — small, fast, well-distributed seeded PRNG. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withSeed<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function variance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

function winRatePct(trades: ClosedTrade[]): number | null {
  if (trades.length === 0) return null;
  return (trades.filter((t) => t.returnAfterFeesPct > 0).length / trades.length) * 100;
}

function genomeSignature(g: Genome): string {
  return `${g.fastMa}-${g.slowMa}-${g.rsiPeriod}-${g.rsiLow}-${g.rsiHigh}`;
}

type Row = Record<string, unknown>;

function runOne(window: LoadedWindow, mutationRateLabel: string, mutationRate: number, seed: number): { genRows: Row[]; runRow: Row; tradeRows: Row[] } {
  const isCrash = window.regime === "crash";
  const { train, test } = splitTrainTest(window.closes, TRAIN_RATIO);
  const cut = Math.floor(window.closes.length * TRAIN_RATIO);
  const testTimes = window.times.slice(cut);
  const runId = `${window.id}_${mutationRateLabel}_seed${seed}`;

  const genRows: Row[] = [];
  let bestEverFitness: number | null = null;
  let bestEverGenome: Genome | null = null;
  let firstChampionGenome: Genome | null = null;
  let totalBlocked = 0;
  let totalQuarantined = 0;
  const bestFitnessHistory: number[] = [];

  withSeed(seed, () => {
    let population = initialPopulation();
    let graveyard: GraveyardEntry[] = [];
    let quarantine: GraveyardEntry[] = [];

    for (let gen = 0; gen < GENERATIONS; gen++) {
      const result = evolveGeneration(population, train, test, 0, gen, graveyard, quarantine, {
        mutationRateOverride: mutationRate,
        disableMutationBoost: true,
      });
      population = result.nextPopulation;
      graveyard = result.graveyard;
      quarantine = result.quarantine;

      const fitnesses = result.evaluatedPopulation.map((i) => i.fitness);
      const champTest = evaluateGenome(result.best.genome, test); // same genome evolveGeneration already scored — just also want its maxDrawdown
      const quarantinedThisGen = result.eliminatedThisGeneration.filter((e) => e.reason !== "outcompeted").length;

      if (bestEverFitness === null || result.best.fitness > bestEverFitness) {
        bestEverFitness = result.best.fitness;
        bestEverGenome = result.best.genome;
      }
      if (result.historyEntry.generation === 1) firstChampionGenome = result.best.genome;

      totalBlocked += result.blockedEvents.length;
      totalQuarantined += quarantinedThisGen;
      bestFitnessHistory.push(result.historyEntry.bestFitness);

      genRows.push({
        run_id: runId,
        regime: window.regime,
        window_id: window.id,
        mutation_rate: mutationRate,
        seed,
        generation: result.historyEntry.generation,
        best_train_fitness: result.historyEntry.bestFitness,
        avg_train_fitness: result.historyEntry.avgFitness,
        fitness_variance: variance(fitnesses),
        diversity: result.historyEntry.diversity,
        champion_test_return_pct: (result.historyEntry.testEquity - 1) * 100,
        champion_test_max_drawdown_pct: champTest.maxDrawdown * 100,
        buy_and_hold_test_return_pct: (result.historyEntry.buyAndHoldEquity - 1) * 100,
        eliminated_count: result.eliminatedThisGeneration.length,
        quarantined_count: quarantinedThisGen,
        blocked_count: result.blockedEvents.length,
      });
    }
  });

  // First generation (1-indexed) after which best-train-fitness improves by
  // less than 0.1% (relative) over the NEXT 10 generations.
  let convergenceGen: number | null = null;
  for (let g = 0; g <= GENERATIONS - 10; g++) {
    const base = bestFitnessHistory[g];
    const after10 = bestFitnessHistory[g + 9];
    const rel = Math.abs(base) > 1e-9 ? (after10 - base) / Math.abs(base) : after10 - base;
    if (rel < 0.001) {
      convergenceGen = g + 1;
      break;
    }
  }

  // Trade logs for the gen-1 champion and the final (best-ever) champion,
  // both scored on the SAME unseen test window.
  const tradeRows: Row[] = [];
  const logTrades = (genome: Genome, which: "gen1_champion" | "final_champion"): ClosedTrade[] => {
    const trades: ClosedTrade[] = [];
    evaluateGenome(genome, test, (t) => trades.push(t));
    for (const t of trades) {
      tradeRows.push({
        run_id: runId,
        regime: window.regime,
        window_id: window.id,
        mutation_rate: mutationRate,
        seed,
        which,
        strategy_id: genomeSignature(genome),
        direction: t.direction,
        entry_time_utc: new Date(testTimes[t.entryIndex]).toISOString(),
        entry_price: t.entryPrice,
        exit_time_utc: new Date(testTimes[t.exitIndex]).toISOString(),
        exit_price: t.exitPrice,
        return_after_fees_pct: Number(t.returnAfterFeesPct.toFixed(6)),
        win: t.returnAfterFeesPct > 0,
      });
    }
    return trades;
  };

  const gen1Trades = firstChampionGenome ? logTrades(firstChampionGenome, "gen1_champion") : [];
  const finalTrades = bestEverGenome ? logTrades(bestEverGenome, "final_champion") : [];

  const gen1Result = firstChampionGenome ? evaluateGenome(firstChampionGenome, test) : null;
  const finalResult = bestEverGenome ? evaluateGenome(bestEverGenome, test) : null;
  const bh = buyAndHoldEquity(test);

  const runRow: Row = {
    run_id: runId,
    regime: window.regime,
    window_id: window.id,
    mutation_rate: mutationRate,
    seed,
    gen1_champion_test_return_pct: gen1Result ? (gen1Result.netEquity - 1) * 100 : null,
    final_champion_test_return_pct: finalResult ? (finalResult.netEquity - 1) * 100 : null,
    buy_and_hold_test_return_pct: (bh - 1) * 100,
    final_champion_test_max_drawdown_pct: finalResult ? finalResult.maxDrawdown * 100 : null,
    final_champion_test_trades: finalTrades.length,
    final_champion_test_win_rate_pct: winRatePct(finalTrades),
    generation_of_convergence: convergenceGen,
    total_blocked: totalBlocked,
    total_quarantined: totalQuarantined,
    final_fast_ma: bestEverGenome ? (bestEverGenome as Genome).fastMa : null,
    final_slow_ma: bestEverGenome ? (bestEverGenome as Genome).slowMa : null,
    final_rsi_period: bestEverGenome ? (bestEverGenome as Genome).rsiPeriod : null,
    final_rsi_low: bestEverGenome ? (bestEverGenome as Genome).rsiLow : null,
    final_rsi_high: bestEverGenome ? (bestEverGenome as Genome).rsiHigh : null,
  };

  void gen1Trades; // counted via tradeRows; kept for clarity at the call site
  void isCrash; // regime already carries this distinction through to analysis
  return { genRows, runRow, tradeRows };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const windows: WindowMeta[] = JSON.parse(readFileSync(path.join(DATA_DIR, "windows.json"), "utf8"));
  const loaded = windows.map(loadWindow);
  const regimeWindows = loaded.filter((w) => w.regime !== "crash");
  const crashWindows = loaded.filter((w) => w.regime === "crash");

  const allGenRows: Row[] = [];
  const allRunRows: Row[] = [];
  const allTradeRows: Row[] = [];

  const rateEntries = Object.entries(MUTATION_RATES);
  const mainTotal = regimeWindows.length * rateEntries.length * SEEDS;
  const crashTotal = crashWindows.length * rateEntries.length * SEEDS;
  console.log(`Main experiment: ${regimeWindows.length} windows x ${rateEntries.length} rates x ${SEEDS} seeds = ${mainTotal} runs`);
  console.log(`Crash stress test: ${crashWindows.length} windows x ${rateEntries.length} rates x ${SEEDS} seeds = ${crashTotal} runs`);

  const t0 = Date.now();
  let done = 0;
  for (const [label, rate] of rateEntries) {
    for (const window of regimeWindows) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const { genRows, runRow, tradeRows } = runOne(window, label, rate, seed);
        allGenRows.push(...genRows);
        allRunRows.push(runRow);
        allTradeRows.push(...tradeRows);
        done++;
      }
    }
  }
  console.log(`Main experiment: ${done} runs done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const t1 = Date.now();
  let crashDone = 0;
  for (const [label, rate] of rateEntries) {
    for (const window of crashWindows) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const { genRows, runRow, tradeRows } = runOne(window, label, rate, seed);
        allGenRows.push(...genRows);
        allRunRows.push(runRow);
        allTradeRows.push(...tradeRows);
        crashDone++;
      }
    }
  }
  console.log(`Crash stress test: ${crashDone} runs done in ${((Date.now() - t1) / 1000).toFixed(1)}s`);

  const genCols = [
    "run_id", "regime", "window_id", "mutation_rate", "seed", "generation",
    "best_train_fitness", "avg_train_fitness", "fitness_variance", "diversity",
    "champion_test_return_pct", "champion_test_max_drawdown_pct", "buy_and_hold_test_return_pct",
    "eliminated_count", "quarantined_count", "blocked_count",
  ];
  const runCols = [
    "run_id", "regime", "window_id", "mutation_rate", "seed",
    "gen1_champion_test_return_pct", "final_champion_test_return_pct", "buy_and_hold_test_return_pct",
    "final_champion_test_max_drawdown_pct", "final_champion_test_trades", "final_champion_test_win_rate_pct",
    "generation_of_convergence", "total_blocked", "total_quarantined",
    "final_fast_ma", "final_slow_ma", "final_rsi_period", "final_rsi_low", "final_rsi_high",
  ];
  const tradeCols = [
    "run_id", "regime", "window_id", "mutation_rate", "seed", "which", "strategy_id", "direction",
    "entry_time_utc", "entry_price", "exit_time_utc", "exit_price", "return_after_fees_pct", "win",
  ];

  writeFileSync(path.join(OUT_DIR, "generations.csv"), toCsv(allGenRows, genCols));
  writeFileSync(path.join(OUT_DIR, "runs.csv"), toCsv(allRunRows, runCols));
  writeFileSync(path.join(OUT_DIR, "trades.csv"), toCsv(allTradeRows, tradeCols));

  console.log(`\nWrote ${allGenRows.length} generation rows -> generations.csv`);
  console.log(`Wrote ${allRunRows.length} run rows -> runs.csv`);
  console.log(`Wrote ${allTradeRows.length} trade rows -> trades.csv`);
  console.log(`Total elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
