/**
 * Classifies the 12-month history into non-overlapping 2000-candle windows
 * by regime (uptrend/downtrend/sideways), picks 3 per regime spread across
 * the year, and locates each of the 3 crash windows inside its own
 * downloaded range so the crash itself falls in the test segment (newest
 * 30%). Saves one CSV per selected window plus windows.json, per
 * EXPERIMENTS.md.
 *
 * Run: npx tsx scripts/experiments/classify-windows.ts
 * (after download-data.ts and download-crash-data.ts)
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Candle } from "./binance";
import { toCsv } from "./csv";

const DATA_DIR = path.resolve(process.cwd(), "experiments/output/data");
const WINDOW_SIZE = 2000;
const TRAIN_RATIO = 0.7; // must match ga-engine.ts's TRAIN_RATIO

type WindowSpan = { startIdx: number; endIdx: number; startTime: number; endTime: number; returnPct: number };

type SelectedWindow = {
  id: string;
  regime: "uptrend" | "downtrend" | "sideways" | "crash";
  candles: Candle[];
  span: WindowSpan;
  thresholdUsed: number | null;
  thresholdRelaxed: boolean;
};

function loadCandles(file: string): Candle[] {
  return JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf8"));
}

function windowReturn(candles: Candle[], start: number, end: number): number {
  const first = candles[start].close;
  const last = candles[end - 1].close;
  return ((last - first) / first) * 100;
}

function sliceNonOverlapping(candles: Candle[], size: number): WindowSpan[] {
  const windows: WindowSpan[] = [];
  for (let start = 0; start + size <= candles.length; start += size) {
    const end = start + size;
    windows.push({
      startIdx: start,
      endIdx: end,
      startTime: candles[start].openTime,
      endTime: candles[end - 1].closeTime,
      returnPct: windowReturn(candles, start, end),
    });
  }
  return windows;
}

/** Pick `count` candidates maximally spread out across a time-sorted list. */
function pickSpread<T>(candidates: T[], count: number): T[] {
  if (candidates.length <= count) return candidates;
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * (candidates.length - 1)) / (count - 1));
    picked.push(candidates[idx]);
  }
  return picked;
}

function saveWindowCsv(id: string, candles: Candle[], span: WindowSpan) {
  const rows: Record<string, unknown>[] = [];
  for (let i = span.startIdx; i < span.endIdx; i++) {
    const c = candles[i];
    rows.push({
      index: i - span.startIdx,
      open_time_utc: new Date(c.openTime).toISOString(),
      close_time_utc: new Date(c.closeTime).toISOString(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    });
  }
  const csv = toCsv(rows, ["index", "open_time_utc", "close_time_utc", "open", "high", "low", "close", "volume"]);
  writeFileSync(path.join(DATA_DIR, `window_${id}.csv`), csv);
}

async function main() {
  const log: string[] = [];
  const record = (s: string) => {
    console.log(s);
    log.push(s);
  };

  const selected: SelectedWindow[] = [];

  // ── Main experiment: regime windows from the 12-month history ─────────
  const history: Candle[] = loadCandles("raw_history.json");
  record(
    `Loaded ${history.length} candles (${new Date(history[0].openTime).toISOString()} -> ${new Date(
      history[history.length - 1].openTime
    ).toISOString()})`
  );

  const allWindows = sliceNonOverlapping(history, WINDOW_SIZE);
  record(`${allWindows.length} non-overlapping ${WINDOW_SIZE}-candle windows available`);

  const THRESHOLDS = { uptrend: 6, downtrend: -6, sideways: 2 } as const;
  const inRegime = (regime: keyof typeof THRESHOLDS, threshold: number, w: WindowSpan) => {
    if (regime === "uptrend") return w.returnPct >= threshold;
    if (regime === "downtrend") return w.returnPct <= threshold;
    return Math.abs(w.returnPct) <= threshold;
  };

  for (const regime of ["uptrend", "downtrend", "sideways"] as const) {
    let threshold: number = THRESHOLDS[regime];
    let pool = allWindows.filter((w) => inRegime(regime, threshold, w));
    let relaxed = false;
    let steps = 0;
    while (pool.length < 3 && steps < 20) {
      steps++;
      relaxed = true;
      threshold = regime === "uptrend" ? threshold - 0.5 : regime === "downtrend" ? threshold + 0.5 : threshold + 0.5;
      pool = allWindows.filter((w) => inRegime(regime, threshold, w));
    }
    record(`${regime}: ${pool.length} candidate windows at threshold ${threshold}%${relaxed ? " (relaxed from " + THRESHOLDS[regime] + "%)" : ""}`);

    const chosen = pickSpread(pool, 3);
    chosen.forEach((span, i) => {
      selected.push({
        id: `${regime}_${i + 1}`,
        regime,
        candles: history,
        span,
        thresholdUsed: threshold,
        thresholdRelaxed: relaxed,
      });
    });
  }

  // ── Crash windows: locate the real crash inside each downloaded range ──
  const CRASHES = [
    { id: "crash_covid_2020", file: "crash_covid_2020_raw.json", label: "COVID crash (Black Thursday)" },
    { id: "crash_terra_luna_2022", file: "crash_terra_luna_2022_raw.json", label: "Terra/Luna collapse" },
    { id: "crash_ftx_2022", file: "crash_ftx_2022_raw.json", label: "FTX collapse" },
  ];

  for (const crash of CRASHES) {
    const candles: Candle[] = loadCandles(crash.file);

    // Locate the real point of maximum peak-to-trough drawdown — the
    // actual "crash moment" — to both verify the known date and position
    // the window around it.
    let peak = candles[0].close;
    let peakIdx = 0;
    let maxDD = 0;
    let troughIdx = 0;
    for (let i = 0; i < candles.length; i++) {
      if (candles[i].close > peak) {
        peak = candles[i].close;
        peakIdx = i;
      }
      const dd = (peak - candles[i].close) / peak;
      if (dd > maxDD) {
        maxDD = dd;
        troughIdx = i;
      }
    }
    record(
      `${crash.label}: biggest drop ${(maxDD * 100).toFixed(1)}% — peak ${new Date(candles[peakIdx].openTime).toISOString()} -> trough ${new Date(
        candles[troughIdx].openTime
      ).toISOString()}`
    );

    // Position a 2000-candle window so the trough lands about 60% of the
    // way through the test segment (newest 30% = 600 candles).
    const testLen = WINDOW_SIZE - Math.round(WINDOW_SIZE * TRAIN_RATIO); // 600
    const targetTroughOffsetInTest = Math.round(testLen * 0.6);
    let windowStart = troughIdx - (WINDOW_SIZE - testLen) - targetTroughOffsetInTest;
    windowStart = Math.max(0, Math.min(windowStart, candles.length - WINDOW_SIZE));
    const windowEnd = windowStart + WINDOW_SIZE;
    if (windowEnd > candles.length) {
      throw new Error(`${crash.label}: not enough downloaded data for a ${WINDOW_SIZE}-candle window (have ${candles.length}).`);
    }

    const span: WindowSpan = {
      startIdx: windowStart,
      endIdx: windowEnd,
      startTime: candles[windowStart].openTime,
      endTime: candles[windowEnd - 1].closeTime,
      returnPct: windowReturn(candles, windowStart, windowEnd),
    };
    const testStartIdx = windowStart + Math.round(WINDOW_SIZE * TRAIN_RATIO);
    const troughInTest = troughIdx >= testStartIdx && troughIdx < windowEnd;
    record(
      `  window: ${new Date(span.startTime).toISOString()} -> ${new Date(span.endTime).toISOString()}, return ${span.returnPct.toFixed(
        2
      )}%, trough inside test segment: ${troughInTest}`
    );
    if (!troughInTest) {
      throw new Error(`${crash.label}: could not position the crash inside the test segment with the downloaded range — widen the download.`);
    }

    selected.push({ id: crash.id, regime: "crash", candles, span, thresholdUsed: null, thresholdRelaxed: false });
  }

  // ── Save CSVs + windows.json ────────────────────────────────────────────
  const windowsJson = selected.map((s) => {
    const cut = s.span.startIdx + Math.floor(WINDOW_SIZE * TRAIN_RATIO);
    saveWindowCsv(s.id, s.candles, s.span);
    return {
      id: s.id,
      regime: s.regime,
      returnPct: Number(s.span.returnPct.toFixed(4)),
      startDate: new Date(s.span.startTime).toISOString(),
      endDate: new Date(s.span.endTime).toISOString(),
      trainStartDate: new Date(s.span.startTime).toISOString(),
      trainEndDate: new Date(s.candles[cut - 1].closeTime).toISOString(),
      testStartDate: new Date(s.candles[cut].openTime).toISOString(),
      testEndDate: new Date(s.span.endTime).toISOString(),
      candleCount: WINDOW_SIZE,
      thresholdUsedPct: s.thresholdUsed,
      thresholdRelaxed: s.thresholdRelaxed,
    };
  });

  writeFileSync(path.join(DATA_DIR, "windows.json"), JSON.stringify(windowsJson, null, 2));
  writeFileSync(path.join(DATA_DIR, "classify_log.txt"), log.join("\n") + "\n");
  record(`\nSelected ${selected.length} windows total (9 regime + 3 crash). Saved windows.json and per-window CSVs in ${DATA_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
