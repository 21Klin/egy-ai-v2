/**
 * Downloads real BTC/USDT 5-minute candles around three historical crashes
 * for the crash stress test (separate from the main 12-month experiment —
 * these dates are outside that window). Each range is downloaded wider
 * than the 2000-candle window the experiment actually uses, so
 * classify-windows.ts can locate the real steepest drop in the data and
 * position a clean 2000-candle window with the crash inside the test
 * segment (newest 30%), per EXPERIMENTS.md.
 *
 * Run: npx tsx scripts/experiments/download-crash-data.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fetchKlines } from "./binance";

const OUT_DIR = path.resolve(process.cwd(), "experiments/output/data");

// Wide download ranges (UTC) bracketing each crash — refined to the exact
// biggest-drop dates (and the final 2000-candle window) in classify-windows.ts.
const CRASHES = [
  { id: "covid_2020", label: "COVID crash (Black Thursday)", start: "2020-03-04T00:00:00Z", end: "2020-03-17T00:00:00Z" },
  { id: "terra_luna_2022", label: "Terra/Luna collapse", start: "2022-05-01T00:00:00Z", end: "2022-05-17T00:00:00Z" },
  { id: "ftx_2022", label: "FTX collapse", start: "2022-10-29T00:00:00Z", end: "2022-11-14T00:00:00Z" },
] as const;

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const crash of CRASHES) {
    const start = new Date(crash.start).getTime();
    const end = new Date(crash.end).getTime();
    console.log(`Downloading ${crash.label}: ${crash.start} -> ${crash.end}...`);
    const t0 = Date.now();
    const candles = await fetchKlines(start, end);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    if (candles.length === 0) throw new Error(`Downloaded zero candles for ${crash.id} — aborting.`);

    const outFile = path.join(OUT_DIR, `crash_${crash.id}_raw.json`);
    writeFileSync(outFile, JSON.stringify(candles));
    console.log(`  ${candles.length} candles in ${elapsed}s -> ${outFile}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
