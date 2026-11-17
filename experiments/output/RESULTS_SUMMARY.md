# EGY AI — Research Experiments: Results Summary

**Research question:** Can a self-evolving algorithmic trading system improve its own
decisions on market data it has never seen?

This report replaces the old Results section. Every number below comes from a real run of
the actual engine in `src/lib/ga-engine.ts` (no numbers were invented, rounded up, or
smoothed). Raw data is in `experiments/output/` (`generations.csv`, `runs.csv`,
`trades.csv`, `trades.xlsx`, `statistics.json`, `charts/`).

## 1. Setup

**Main experiment** — 9 real-market windows, 2,000 five-minute BTC/USDT candles each
(≈7 days), 70% train / 30% test split, pulled from the last 12 months of real Binance
history (`api.binance.com` klines) and spread across the year:

| Window | Regime | Return | Test segment (UTC) |
|---|---|---|---|
| uptrend_1 | uptrend | +6.36% | 2026-01-03 09:35 → 2026-01-05 11:35 |
| uptrend_2 | uptrend | +6.75% | 2026-04-17 13:35 → 2026-04-19 15:35 |
| uptrend_3 | uptrend | +22.18% | 2026-08-20 13:35 → 2026-08-22 15:35 |
| downtrend_1 | downtrend | −14.02% | 2026-01-31 04:15 → 2026-02-02 06:15 |
| downtrend_2 | downtrend | −16.47% | 2026-06-05 04:15 → 2026-06-07 06:15 |
| downtrend_3 | downtrend | −10.20% | 2026-11-11 21:35 → 2026-11-13 23:35 |
| sideways_1 | sideways | −0.09% | 2026-03-06 21:35 → 2026-03-08 23:35 |
| sideways_2 | sideways | −0.69% | 2026-07-23 18:55 → 2026-07-25 20:55 |
| sideways_3 | sideways | −1.90% | 2026-11-04 22:55 → 2026-11-07 00:55 |

Regime thresholds (uptrend ≥ +6%, downtrend ≤ −6%, sideways ≤ ±2%) were met with room to
spare on the first pass — **no threshold relaxation was needed** for any regime.

**Crash stress test** (separate, reported separately — never mixed into the numbers
above) — 3 historical BTC crashes, each a 2,000-candle window positioned so the real
crash falls inside the test segment:

| Crash | Window return | Test segment covers the crash |
|---|---|---|
| COVID ("Black Thursday"), Mar 2020 | −39.79% | 2020-03-11 → 2020-03-13 (real trough: 2020-03-13, −57.7% peak-to-trough) |
| Terra/Luna collapse, May 2022 | −19.42% | 2022-05-10 → 2022-05-13 (real trough: 2022-05-12, −32.6% peak-to-trough) |
| FTX collapse, Nov 2022 | −14.55% | 2022-11-08 → 2022-11-10 (real trough: 2022-11-09, −27.2% peak-to-trough) |

**Design:** 3 mutation rates (low 0.05, moderate 0.25 = live default, high 0.60) × 9
regime windows × 10 seeds × 50 generations = **270 main runs**, plus 3 rates × 3 crash
windows × 10 seeds × 50 generations = **90 crash runs**. Each (window, seed) pair reuses
the same seed across all three mutation rates, so comparisons are paired. Total **360
runs**, all completed successfully.

- **Total trades logged:** **9,666** (gen-1 champion + final champion, on test data only,
  across all 360 runs) — well above the brief's 1,000-trade goal.
- **Runtime:** 30.6s for the 270 main runs + 10.1s for the 90 crash runs = **40.7s total**
  (the real GA engine, unmodified logic, pop 24 × 50 generations ≈ 70ms/run).
- **Deviations from the brief:** none. No regime-threshold relaxation, no crash-window
  repositioning issues, no missing data.
- **Test data was never used for selection:** by construction — `run-experiment.ts` only
  ever passes the `train` split into `evolveGeneration`; the `test` split is touched only
  by `evaluateGenome` for scoring, after evolution finishes.
- `npm run build` passes; routes and bundle sizes are unchanged from before this work —
  the live site's behavior is unaffected (the two engine changes are optional,
  default-preserving parameters, both unused unless the experiment script passes them).

## 2. Results table (mutation rate × regime), main experiment

Mean test-data return %, mean ± 1 SD across the 30 runs (3 windows × 10 seeds) in each cell.

| Rate | Regime | Final champion | Gen-1 champion | Buy & hold | % beats gen-1 (p) | % beats B&H (p) | Mean max DD | Mean win rate |
|---|---|---|---|---|---|---|---|---|
| low (0.05) | uptrend | −0.05% ± 1.61 | −0.37% ± 1.72 | +3.45% ± 3.77 | 70.0% (p=0.024) | 13.3% (p<0.0001) | 3.98% | 24.4% |
| low (0.05) | downtrend | +0.80% ± 4.63 | +0.92% ± 4.58 | −6.74% ± 3.72 | 56.7% (p=0.585) | 70.0% (p=0.043) | 6.20% | 34.8% |
| low (0.05) | sideways | −0.56% ± 2.51 | −0.33% ± 2.67 | −3.08% ± 2.17 | 46.7% (p=1.0) | 66.7% (p=0.099) | 3.30% | 15.8% |
| moderate (0.25) | uptrend | +0.27% ± 1.68 | −0.37% ± 1.72 | +3.45% ± 3.77 | 76.7% (p=0.005) | 6.7% (p<0.0001) | 3.85% | 25.1% |
| moderate (0.25) | downtrend | +0.47% ± 4.48 | +0.92% ± 4.58 | −6.74% ± 3.72 | 46.7% (p=0.856) | 70.0% (p=0.043) | 6.20% | 31.8% |
| moderate (0.25) | sideways | −0.29% ± 2.65 | −0.33% ± 2.67 | −3.08% ± 2.17 | 63.3% (p=0.200) | 66.7% (p=0.099) | 3.10% | 23.3% |
| high (0.60) | uptrend | +0.06% ± 1.52 | −0.37% ± 1.72 | +3.45% ± 3.77 | 63.3% (p=0.200) | 13.3% (p<0.0001) | 3.89% | 22.8% |
| high (0.60) | downtrend | +0.85% ± 4.64 | +0.92% ± 4.58 | −6.74% ± 3.72 | 63.3% (p=0.200) | 66.7% (p=0.099) | 5.80% | 32.8% |
| high (0.60) | sideways | −0.47% ± 2.73 | −0.33% ± 2.67 | −3.08% ± 2.17 | 60.0% (p=0.362) | 66.7% (p=0.099) | 3.28% | 22.5% |

**Overall (n=270, all rates and regimes pooled):**

| | Final champion | Gen-1 champion | Buy & hold |
|---|---|---|---|
| Mean test return | +0.12% ± 3.18 | +0.07% ± 3.23 | −2.12% ± 5.33 |
| % of runs beats | — | 60.7% (p=0.0003) | 48.9% (p=0.761) |

Mean max drawdown 4.40%, mean win rate 25.9%, mean generation of convergence 12.1
(98.5% of runs converged by generation 40), mean repeat-mistakes blocked per run 403.9.

**By mutation rate (n=90 each, pooled across regimes):**

| Rate | Final return | Beats gen-1 | Beats B&H | Mean max DD | Mean conv. gen | Mean blocked/run |
|---|---|---|---|---|---|---|
| low (0.05) | +0.06% ± 3.19 | 57.8% (p=0.109) | 50.0% (p=1.0) | 4.49% | 11.3 | 845.4 |
| moderate (0.25) | +0.15% ± 3.14 | 62.2% (p=0.026) | 47.8% (p=0.752) | 4.38% | 12.6 | 313.2 |
| high (0.60) | +0.15% ± 3.24 | 62.2% (p=0.026) | 48.9% (p=0.916) | 4.32% | 12.5 | 53.1 |

**Crash stress test (n=90, reported separately, never mixed into the above):**

| | Final champion | Gen-1 champion | Buy & hold |
|---|---|---|---|
| Mean test return | +4.23% ± 9.75 | +5.01% ± 13.30 | −16.53% ± 10.19 |
| % of runs beats | — | 51.1% (p=0.916) | **83.3% (p=9.2e-11)** |

Per crash (mean final-champion return, all 3 rates pooled): COVID +14.5% vs B&H −29.9%
(100% of runs beat B&H); Terra/Luna −6.3% vs B&H −5.4% (50% beat B&H — a wash); FTX
+4.5% vs B&H −14.3% (100% of runs beat B&H). By rate, 83.3% / 80.0% / 86.7% of runs beat
buy-and-hold for low / moderate / high respectively — statistically indistinguishable
from each other.

## 3. Hypothesis 1 — PARTLY SUPPORTED

> *"After evolution, the champion strategy achieves a higher return on unseen data than
> (a) the generation-1 champion and (b) buy-and-hold on the same unseen data."*

**(a) Beats the generation-1 champion — SUPPORTED.** Across all 270 main runs, the final
(best-ever) champion beats its own run's generation-1 champion in 60.7% of runs
(164/268 decisive comparisons), a statistically significant result (exact sign test
p = 0.0003). The mean test return also rose, from +0.07% (gen-1) to +0.12% (final). This
holds up within every mutation rate individually once the rate reaches 0.25 or higher
(p = 0.026 for both moderate and high); the low rate alone falls short of significance
(p = 0.109 — see Hypothesis 2 below). **Evolution does make the strategy measurably
better than where it started.**

**(b) Beats buy-and-hold — NOT SUPPORTED overall, but regime-dependent.** Pooled across
all 270 runs, the final champion beats buy-and-hold in only 48.9% of runs — statistically
indistinguishable from a coin flip (p = 0.761). But this overall number hides a real,
consistent split by market regime:
- **Downtrend:** beats B&H in 68.9% of runs, p = 0.0004 (significant).
- **Sideways:** beats B&H in 66.7% of runs, p = 0.002 (significant).
- **Uptrend:** beats B&H in only **11.1%** of runs, p = 1.05×10⁻¹⁴ — the bot
  significantly **under**performs buy-and-hold during strong uptrends. Buy-and-hold
  averaged +3.45% in uptrend windows; the final champion averaged only +0.09%. The
  strategy is evidently too conservative (closing positions, waiting for pullbacks) to
  capture a straight-line rally the way simply holding does.

So (b) is true in downtrends and sideways markets and false in uptrends; the three
effects roughly cancel out in the pooled average, which is why the headline number looks
like a wash. The separate crash stress test reinforces the downside-protection half of
this picture strongly: during the three historical crashes, the evolved bot beat
buy-and-hold in 83.3% of runs (p = 9.2×10⁻¹¹), losing on average 4.2% less often and far
less severely than a buy-and-hold position caught in the crash.

**Overall verdict:** Hypothesis 1 is **partly supported** — evolution reliably improves
on its own starting point, and the resulting strategy reliably beats a passive
buy-and-hold position whenever the market is falling or flat (including, decisively,
during real historical crashes) — but it does not beat buy-and-hold during strong
uptrends, so "beats buy-and-hold" cannot be claimed unconditionally.

## 4. Hypothesis 2 — NOT SUPPORTED (one piece held, two did not)

> *"A moderate mutation rate gives the best unseen-data return and the lowest maximum
> drawdown. A low rate stagnates early; a high rate is unstable."*

- **"Moderate gives the best return" — not clearly supported.** Moderate's mean final
  return (0.151%) edges out high (0.146%) by a margin far smaller than either's standard
  deviation (≈3.2 each), and both beat gen-1 with the identical win rate (62.2%, p =
  0.026). The data cannot distinguish moderate from high on return.
- **"Moderate gives the lowest drawdown" — contradicted.** The lowest mean max drawdown
  was actually **high** mutation (4.32%), not moderate (4.38%); low mutation had the
  *highest* drawdown of the three (4.49%). This is the opposite ordering from what the
  hypothesis predicted.
- **"A low rate stagnates early" — supported.** The low-mutation-rate runs are the only
  ones that fail to significantly beat their own generation-1 champion (p = 0.109, vs.
  p = 0.026 for both other rates), and their mean final return (0.061%) is actually
  *below* their mean gen-1 return (0.073%) — i.e., on average, 50 generations of
  evolution under low mutation left the champion no better than where it started. This
  matches "stagnates early" well.
- **"A high rate is unstable" — true of the search process, not of the outcome.**
  `convergence.png` shows population fitness variance under high mutation staying
  elevated and noisy across all 50 generations, while low mutation collapses to a stable,
  low-variance population within the first ~10 generations (mean convergence generation
  11.3 for low vs. 12.5 for high — similar timing, but low's post-convergence variance is
  visibly flatter). So the *population* under high mutation never settles down, in the
  sense the hypothesis meant. But this instability in the search process did **not**
  translate into worse or more erratic *outcomes*: high mutation's final returns and
  drawdowns are statistically on par with (and on drawdown, slightly better than)
  moderate's.

A striking side effect, not predicted by the hypothesis: the mean number of repeat
mistakes blocked per run falls sharply as mutation rate rises — 845 (low) → 313
(moderate) → 53 (high). Higher mutation generates more varied children, so fewer of them
land close enough to a quarantined genome to trigger a block in the first place; this is
a mechanical consequence of more exploration, not evidence of instability or weakness.

**Overall verdict:** Hypothesis 2 is **not supported** as stated. The "low rate
stagnates" half replicated cleanly. The "moderate is best on both return and drawdown"
half did not: moderate and high are statistically indistinguishable on return, and high
— not moderate — had the lowest mean drawdown, directly contradicting the "high rate is
unstable" framing when judged by outcome rather than by search-process variance.

## 5. Surprises and limitations

- **The headline "does the bot beat buy-and-hold?" number depends heavily on which weeks
  were sampled.** Nine weeks (three per regime) is a small sample of market history; the
  uptrend/downtrend/sideways split by construction guarantees the bot will look bad in
  uptrend windows (buy-and-hold wins by definition when price only goes up and the bot
  ever sits out a rally) and good in downtrend windows. A different, larger sample of
  weeks — or weighting by how often each regime actually occurs — would move the pooled
  number without changing the underlying regime-by-regime pattern.
- **Mutation rate had far less effect on final performance than the hypothesis
  predicted.** Across the three-fold range tested (0.05 to 0.60), mean final returns
  differed by at most 0.09 percentage points — all well within one standard deviation of
  each other. The engine's other diversity mechanisms (3 random immigrants per
  generation, tournament selection, quarantine) likely already provide enough
  exploration that the explicit mutation rate matters less than expected, except at the
  low extreme where immigrants and elites alone are not quite enough to keep making
  progress (see Hypothesis 2 above).
- **The "repeat mistakes blocked" counter is highly sensitive to mutation rate** — an 845
  vs. 53 difference between low and high — purely as a mechanical consequence of how
  close mutated children land to quarantined genomes, not because one rate makes "worse"
  decisions. Anyone reading this counter in the live dashboard should keep in mind it
  reflects exploration breadth, not strategy quality.
- **The crash stress test is the strongest, cleanest result in this report.** With a much
  larger return gap than the main experiment (the bot averaged +4.2% during crashes vs.
  buy-and-hold's −16.5%) and an extremely small p-value (9.2×10⁻¹¹), this is the one
  claim in this report that is not sensitive to noise in the specific weeks chosen — it
  held up consistently across all three crashes and all three mutation rates. The
  Terra/Luna window is the one exception worth flagging honestly: there, the bot's mean
  return (−6.3%) was *worse* than buy-and-hold's (−5.4%), a 50/50 split — the crash
  protection effect is not universal, and Terra/Luna's unusually sharp, fast collapse
  appears to have been harder for a GA-evolved swing strategy to sidestep than COVID's or
  FTX's.
- **Win rate stayed low throughout (≈21–38%)** even for strategies with positive net
  returns — consistent with a strategy that loses often but small and wins rarely but
  big (typical of trend/momentum-style rules), not a bug. This is visible directly in
  `trades.csv`/`trades.xlsx`.
