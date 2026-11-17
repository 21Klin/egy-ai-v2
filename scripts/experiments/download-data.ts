/**
 * Downloads the last 12 months of real BTC/USDT 5-minute candles from
 * Binance's public REST API for the main experiment (regime windows).
 *
 * Output: experiments/output/data/raw_history.json — full OHLCV history,
 * NOT committed (see .gitignore) — intermediate data the next step
 * (classify-windows.ts) reads; only the final chosen windows get saved
 * as committed CSVs, per EXPERIMENTS.md.
 *
 * Run: npx tsx scripts/experiments/download-data.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fetchKlines } from "./binance";

const MONTHS_BACK = 12;
const OUT_DIR = path.resolve(process.cwd(), "experiments/output/data");
const RAW_FILE = path.join(OUT_DIR, "raw_history.json");

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const now = Date.now();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - MONTHS_BACK);
  const start = startDate.getTime();

  console.log(`Downloading ${MONTHS_BACK} months of BTCUSDT 5m candles from Binance...`);
  const t0 = Date.now();
  const candles = await fetchKlines(start, now, (n) => {
    if (n % 10000 < 1000) console.log(`  ${n} candles so far...`);
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  if (candles.length === 0) throw new Error("Downloaded zero candles — aborting.");

  console.log(
    `Downloaded ${candles.length} candles in ${elapsed}s (${new Date(candles[0].openTime).toISOString()} -> ${new Date(
      candles[candles.length - 1].openTime
    ).toISOString()})`
  );
  writeFileSync(RAW_FILE, JSON.stringify(candles));
  console.log(`Saved to ${RAW_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
