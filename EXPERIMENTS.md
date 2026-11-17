# EGY AI — Research Experiments Brief

This brief is for Claude Code. It describes the experiments for the EGY AI project book
(FirsTep competition). The results replace the old Results section, which had numbers
nobody can trace back to a real run.

## Golden rules
- **Every number must come from a real run.** Never invent, round up, or "smooth" results.
  If something fails or a result is disappointing, report it as it is.
- **Do not change how the live website behaves.** If the engine needs new options for the
  experiments, add them as **optional parameters whose defaults keep today's behavior exactly**.
  Run `npm run build` afterwards to confirm nothing broke.
- Work on a new branch called `experiments`. Never commit to `main`. Ask before pushing.
- Everything must be **reproducible**: fixed random seeds, saved raw data, recorded dates.
- Put all experiment code in `scripts/experiments/` and all outputs in `experiments/output/`.

## What we are testing
**Research question:** Can a self-evolving algorithmic trading system improve its own decisions
on market data it has never seen?

- **Hypothesis 1:** After evolution, the champion strategy achieves a higher return on unseen
  data than (a) the generation-1 champion and (b) buy-and-hold on the same unseen data.
- **Hypothesis 2:** A moderate mutation rate gives the best unseen-data return and the lowest
  maximum drawdown. A low rate stagnates early; a high rate is unstable.

## The engine (use the real one)
Use the real functions from `src/lib/ga-engine.ts`: `initialPopulation`, `evolveGeneration`,
`evaluateGenome`, `splitTrainTest`, `buyAndHoldEquity`. Do **not** rewrite the GA logic in the
script. Keep every live setting the same unless this brief says otherwise:
population 24, 4 elites, 3 immigrants per generation, tournament size 5, 0.1% fee per trade,
fitness = net equity − 2 × max drawdown, quarantine (net loss or drawdown > 30%) and
`QUARANTINE_SIMILARITY_THRESHOLD`, 70/30 train/test split.

Small, safe engine changes allowed (optional parameters, defaults unchanged):
1. **Mutation rate override** for `evolveGeneration`, so the experiment controls it.
2. **Disable the automatic mutation boost** (the switch to `ELEVATED_MUTATION_RATE` when diversity
   is below `DIVERSITY_FLOOR`) during experiments. Otherwise the mutation rate isn't controlled.
3. **Trade logging:** an optional callback (or return field) on `evaluateGenome` that reports
   every closed trade: entry index, exit index, direction (long or short), entry price,
   exit price, and return after fees. The trading logic itself must stay identical.

The engine uses `Math.random()`. For reproducibility, replace it during the experiment with a
seeded random generator (for example mulberry32), and restore it afterwards.

## Data: real Binance history, three market regimes
1. Download BTC/USDT **5-minute** candles from the Binance public REST endpoint
   `https://api.binance.com/api/v3/klines` (paginate with `startTime`/`endTime`, max 1000 per call,
   be gentle with rate limits). Cover the last **12 months**. If `api.binance.com` is blocked,
   try `https://data-api.binance.vision/api/v3/klines`.
2. Cut the history into non-overlapping windows of **2,000 candles** (about 7 days) and classify
   each one by its total close-to-close return and how straight its path is:
   - **Uptrend:** return ≥ +6%
   - **Downtrend:** return ≤ −6%
   - **Sideways:** |return| ≤ 2%
   Choose **3 windows per regime** (9 in total). Prefer windows spread across the year.
   If a regime has fewer than 3 windows at these thresholds, relax the threshold slightly,
   and **write down exactly what you did**.
3. Save every chosen window's candles as CSV in `experiments/output/data/` and a `windows.json`
   with each window's regime, start date, end date, return %, and the train/test split dates.

## Extra: crash stress test (separate from the main experiment)
Test the bot on three famous Bitcoin crashes, using Binance BTC/USDT 5-minute history:
- **COVID crash ("Black Thursday")**, March 2020
- **Terra/Luna collapse**, May 2022
- **FTX collapse**, November 2022

For each crash, choose a 2,000-candle window placed so that the **crash itself falls inside the
test segment (the newest 30%)** and the training segment covers the days before it. Look up and
verify the exact crash dates from the data (the biggest drop), and record them in
`windows.json` with regime = "crash".

Run it with the same design as below: 3 mutation rates × 3 crash windows × 10 seeds × 50
generations = **90 runs**. Report crash results **separately** from the main 270 runs: they answer
a different question ("does the evolved bot lose less than buy-and-hold during a crash?") and must
not be mixed into the main averages. Add one chart, `crash_test.png`: for each crash, the mean
test return of the gen-1 champion, the final champion (per mutation rate) and buy-and-hold.
Report the results honestly, even if the bot does badly.

## Experiment design
- **Mutation rates:** low = 0.05, moderate = 0.25 (the live default), high = 0.60.
- **Market regimes:** uptrend, downtrend, sideways (3 windows each).
- **Seeds:** 10 independent seeds per combination.
- **Generations:** 50 per run.
- Total: 3 rates × 9 windows × 10 seeds = **270 runs**.
- Every run starts fresh: a new random population, empty graveyard, empty quarantine.
- Within each window, train on the oldest 70% and test on the newest 30% (`splitTrainTest`).
  Selection may only use training data. The test data is used only for measuring.

## What to record
**Per generation, per run** → `experiments/output/generations.csv`:
run_id, regime, window_id, mutation_rate, seed, generation, best_train_fitness,
avg_train_fitness, fitness_variance, diversity, champion_test_return_pct,
champion_test_max_drawdown_pct, buy_and_hold_test_return_pct, eliminated_count,
quarantined_count, blocked_count (repeat mistakes blocked that generation).

**Per run** → `experiments/output/runs.csv`:
run_id, regime, window_id, mutation_rate, seed, gen1_champion_test_return_pct,
final_champion_test_return_pct, buy_and_hold_test_return_pct, final_champion_test_max_drawdown_pct,
final_champion_test_trades, final_champion_test_win_rate_pct, generation_of_convergence
(first generation after which best train fitness improves by less than 0.1% for 10 generations),
total_blocked, total_quarantined, final genome (all 5 genes).

**Every trade** → `experiments/output/trades.csv`, for the **generation-1 champion and the
final champion of every run, on the test data**:
run_id, regime, window_id, mutation_rate, seed, which (gen1_champion or final_champion),
strategy_id, direction, entry_time (UTC), entry_price, exit_time (UTC), exit_price,
return_after_fees_pct, win (true or false).
Also make `trades.xlsx` with the same data, a frozen header row and readable column widths.
Report the **exact total number of trades**. The goal is at least 1,000; if there are fewer,
say so and suggest how to get more (for example, more seeds). Do not pad the number.

## Statistics (keep them simple and honest)
For each mutation rate, each regime, and overall:
- Mean and standard deviation of the final champion's test return, of the gen-1 champion's test
  return, and of buy-and-hold.
- **% of runs where the final champion beats the gen-1 champion** on test data.
- **% of runs where the final champion beats buy-and-hold** on test data.
- Mean max drawdown and mean win rate of the final champion.
- A **sign test** p-value for "final beats gen-1" and "final beats buy-and-hold"
  (paired by run), and a 95% bootstrap confidence interval for the mean improvement.
- Mean generation of convergence per mutation rate.
- Mean repeat mistakes blocked per run.

## Charts (PNG, 1600 × 1000, white background, readable when printed in black and white)
Save in `experiments/output/charts/`:
1. **learning_curve.png:** mean best train fitness and mean champion test return across
   generations, one line per mutation rate (a shaded band for ±1 std is fine).
2. **final_vs_baselines.png:** grouped bars for each regime: gen-1 champion, final champion
   (one bar per mutation rate) and buy-and-hold, as mean test return %, with error bars.
3. **drawdown_by_mutation.png:** mean final max drawdown per mutation rate, per regime.
4. **convergence.png:** mean fitness variance across generations, one line per mutation rate.
Label every axis with units. No chart titles that claim conclusions.

## Final report → `experiments/output/RESULTS_SUMMARY.md`
1. Setup: the windows and their dates, seeds, generations, total runs, total trades,
   runtime, and any deviation from this brief.
2. A results table (mutation rate × regime) with the statistics above.
3. **Hypothesis 1: supported, partly supported, or not supported**, with the numbers.
4. **Hypothesis 2: supported, partly supported, or not supported**, with the numbers.
5. Surprises and limitations (for example, results depending on the specific weeks chosen).
Write it in plain English. If a hypothesis is not supported, say so clearly. That is still a
valid scientific result.

## Before finishing
- `npm run build` passes, and the live site's behavior is unchanged (defaults untouched).
- Spot-check 5 random trades in `trades.csv` by hand against the raw candle CSV.
- Confirm the test data was never used for selection.
- Commit on the `experiments` branch and show me a summary. Ask before pushing.
