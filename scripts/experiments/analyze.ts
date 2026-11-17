/**
 * Computes the statistics EXPERIMENTS.md asks for from runs.csv: means/
 * stddevs, % beating gen-1/buy-and-hold, sign tests, bootstrap CIs,
 * convergence, and blocked-mistakes — grouped overall, by mutation rate,
 * by regime, by (rate x regime), and the crash stress test kept
 * completely separate throughout (never folded into the main numbers).
 *
 * Run: npx tsx scripts/experiments/analyze.ts
 * (after run-experiment.ts)
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fromCsv } from "./csv";
import { mean, stddev, pairedSignTest, bootstrapMeanCi } from "./stats";

const OUT_DIR = path.resolve(process.cwd(), "experiments/output");

type RunRecord = {
  run_id: string;
  regime: string;
  window_id: string;
  mutation_rate: number;
  seed: number;
  gen1_champion_test_return_pct: number;
  final_champion_test_return_pct: number;
  buy_and_hold_test_return_pct: number;
  final_champion_test_max_drawdown_pct: number;
  final_champion_test_trades: number;
  final_champion_test_win_rate_pct: number | null;
  generation_of_convergence: number | null;
  total_blocked: number;
  total_quarantined: number;
};

function parseRuns(): RunRecord[] {
  const rows = fromCsv(readFileSync(path.join(OUT_DIR, "runs.csv"), "utf8"));
  return rows.map((r) => ({
    run_id: r.run_id,
    regime: r.regime,
    window_id: r.window_id,
    mutation_rate: Number(r.mutation_rate),
    seed: Number(r.seed),
    gen1_champion_test_return_pct: Number(r.gen1_champion_test_return_pct),
    final_champion_test_return_pct: Number(r.final_champion_test_return_pct),
    buy_and_hold_test_return_pct: Number(r.buy_and_hold_test_return_pct),
    final_champion_test_max_drawdown_pct: Number(r.final_champion_test_max_drawdown_pct),
    final_champion_test_trades: Number(r.final_champion_test_trades),
    final_champion_test_win_rate_pct: r.final_champion_test_win_rate_pct === "" ? null : Number(r.final_champion_test_win_rate_pct),
    generation_of_convergence: r.generation_of_convergence === "" ? null : Number(r.generation_of_convergence),
    total_blocked: Number(r.total_blocked),
    total_quarantined: Number(r.total_quarantined),
  }));
}

function summarize(runs: RunRecord[], label: string) {
  const finalReturns = runs.map((r) => r.final_champion_test_return_pct);
  const gen1Returns = runs.map((r) => r.gen1_champion_test_return_pct);
  const bhReturns = runs.map((r) => r.buy_and_hold_test_return_pct);
  const drawdowns = runs.map((r) => r.final_champion_test_max_drawdown_pct);
  const winRates = runs.map((r) => r.final_champion_test_win_rate_pct).filter((w): w is number => w !== null);
  const convergence = runs.map((r) => r.generation_of_convergence).filter((c): c is number => c !== null);
  const blocked = runs.map((r) => r.total_blocked);

  const beatsGen1 = runs.filter((r) => r.final_champion_test_return_pct > r.gen1_champion_test_return_pct).length;
  const beatsBH = runs.filter((r) => r.final_champion_test_return_pct > r.buy_and_hold_test_return_pct).length;

  const diffVsGen1 = runs.map((r) => r.final_champion_test_return_pct - r.gen1_champion_test_return_pct);
  const diffVsBH = runs.map((r) => r.final_champion_test_return_pct - r.buy_and_hold_test_return_pct);

  return {
    label,
    n: runs.length,
    finalReturnPct: { mean: mean(finalReturns), std: stddev(finalReturns) },
    gen1ReturnPct: { mean: mean(gen1Returns), std: stddev(gen1Returns) },
    buyHoldReturnPct: { mean: mean(bhReturns), std: stddev(bhReturns) },
    pctBeatsGen1: runs.length ? (beatsGen1 / runs.length) * 100 : null,
    pctBeatsBuyHold: runs.length ? (beatsBH / runs.length) * 100 : null,
    meanMaxDrawdownPct: mean(drawdowns),
    meanWinRatePct: winRates.length ? mean(winRates) : null,
    signTestVsGen1: pairedSignTest(finalReturns, gen1Returns),
    signTestVsBuyHold: pairedSignTest(finalReturns, bhReturns),
    bootstrapCi95VsGen1Pct: bootstrapMeanCi(diffVsGen1),
    bootstrapCi95VsBuyHoldPct: bootstrapMeanCi(diffVsBH),
    meanGenerationOfConvergence: convergence.length ? mean(convergence) : null,
    convergedFraction: runs.length ? convergence.length / runs.length : null,
    meanRepeatsBlockedPerRun: mean(blocked),
  };
}

type Stats = ReturnType<typeof summarize>;

async function main() {
  const all = parseRuns();
  const mainRuns = all.filter((r) => r.regime !== "crash");
  const crashRuns = all.filter((r) => r.regime === "crash");

  if (mainRuns.length !== 270) console.warn(`WARNING: expected 270 main runs, found ${mainRuns.length}`);
  if (crashRuns.length !== 90) console.warn(`WARNING: expected 90 crash runs, found ${crashRuns.length}`);

  const rates = Array.from(new Set(all.map((r) => r.mutation_rate))).sort((a, b) => a - b);
  const regimes = ["uptrend", "downtrend", "sideways"];
  const crashWindows = Array.from(new Set(crashRuns.map((r) => r.window_id)));

  const byRate: Record<number, Stats> = {};
  for (const rate of rates) byRate[rate] = summarize(mainRuns.filter((r) => r.mutation_rate === rate), `rate=${rate}`);

  const byRegime: Record<string, Stats> = {};
  for (const regime of regimes) byRegime[regime] = summarize(mainRuns.filter((r) => r.regime === regime), `regime=${regime}`);

  const byRateRegime: Record<number, Record<string, Stats>> = {};
  for (const rate of rates) {
    byRateRegime[rate] = {};
    for (const regime of regimes) {
      byRateRegime[rate][regime] = summarize(
        mainRuns.filter((r) => r.mutation_rate === rate && r.regime === regime),
        `rate=${rate},regime=${regime}`
      );
    }
  }

  const crashByWindowAndRate: Record<string, Record<number, Stats>> = {};
  for (const w of crashWindows) {
    crashByWindowAndRate[w] = {};
    for (const rate of rates) {
      crashByWindowAndRate[w][rate] = summarize(crashRuns.filter((r) => r.window_id === w && r.mutation_rate === rate), `crash ${w} rate=${rate}`);
    }
  }
  const crashByRate: Record<number, Stats> = {};
  for (const rate of rates) crashByRate[rate] = summarize(crashRuns.filter((r) => r.mutation_rate === rate), `crash rate=${rate}`);

  const results = {
    rates,
    regimes,
    crashWindows,
    overall: summarize(mainRuns, "overall (main experiment)"),
    byRate,
    byRegime,
    byRateRegime,
    crashOverall: summarize(crashRuns, "overall (crash stress test)"),
    crashByRate,
    crashByWindowAndRate,
  };

  writeFileSync(path.join(OUT_DIR, "statistics.json"), JSON.stringify(results, null, 2));
  console.log("Wrote statistics.json");
  console.log("\nOverall (main experiment, n=" + results.overall.n + "):");
  console.log(`  final champion test return: ${results.overall.finalReturnPct.mean.toFixed(3)}% +/- ${results.overall.finalReturnPct.std.toFixed(3)}`);
  console.log(`  gen-1 champion test return: ${results.overall.gen1ReturnPct.mean.toFixed(3)}% +/- ${results.overall.gen1ReturnPct.std.toFixed(3)}`);
  console.log(`  buy & hold test return: ${results.overall.buyHoldReturnPct.mean.toFixed(3)}% +/- ${results.overall.buyHoldReturnPct.std.toFixed(3)}`);
  console.log(`  % beats gen-1: ${results.overall.pctBeatsGen1!.toFixed(1)}% (sign test p=${results.overall.signTestVsGen1.pValue.toFixed(4)})`);
  console.log(`  % beats buy&hold: ${results.overall.pctBeatsBuyHold!.toFixed(1)}% (sign test p=${results.overall.signTestVsBuyHold.pValue.toFixed(4)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
