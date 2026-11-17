/** Small, dependency-free statistics helpers — kept simple and honest, per EXPERIMENTS.md. */

export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/** log(n!) via Stirling-free direct summation — n here is at most ~360, trivial either way. */
function logFactorial(n: number): number {
  let r = 0;
  for (let i = 2; i <= n; i++) r += Math.log(i);
  return r;
}

function logBinomialPmf(n: number, k: number, p: number): number {
  const logC = logFactorial(n) - logFactorial(k) - logFactorial(n - k);
  return logC + k * Math.log(p) + (n - k) * Math.log(1 - p);
}

/** Two-sided exact binomial sign test p-value for n trials, k "successes", under p=0.5. */
export function signTestPValue(n: number, k: number): number {
  if (n === 0) return 1;
  let pTail = 0;
  const kMin = Math.min(k, n - k);
  for (let i = 0; i <= kMin; i++) pTail += Math.exp(logBinomialPmf(n, i, 0.5));
  return Math.min(1, 2 * pTail);
}

/** Paired sign test: for differences d_i = a_i - b_i, how many runs does `a` beat `b`? Exact ties excluded from n (standard convention). */
export function pairedSignTest(a: number[], b: number[]): { n: number; wins: number; pValue: number; winPct: number } {
  let wins = 0;
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    if (d === 0) continue;
    n++;
    if (d > 0) wins++;
  }
  return { n, wins, pValue: signTestPValue(n, wins), winPct: n > 0 ? (wins / n) * 100 : 0 };
}

/** 95% bootstrap CI for the mean of `values`, via B resamples with replacement. Seeded with a simple LCG for reproducibility. */
export function bootstrapMeanCi(values: number[], bootstraps = 2000, seed = 12345): { low: number; high: number } {
  if (values.length === 0) return { low: NaN, high: NaN };
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const means: number[] = [];
  for (let b = 0; b < bootstraps; b++) {
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[Math.floor(rand() * values.length)];
    means.push(sum / values.length);
  }
  means.sort((a, b) => a - b);
  const lowIdx = Math.floor(0.025 * means.length);
  const highIdx = Math.ceil(0.975 * means.length) - 1;
  return { low: means[lowIdx], high: means[Math.min(highIdx, means.length - 1)] };
}
