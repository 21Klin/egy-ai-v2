/**
 * Renders the four EXPERIMENTS.md charts (plus crash_test.png) as SVG,
 * then rasterizes to 1600x1000 PNG via sharp. See svg-charts.ts for the
 * palette/encoding rationale (dataviz skill: validated categorical
 * palette for the 3 mutation rates, neutral greys for the two baseline
 * comparators, dash-pattern secondary encoding on every line so
 * grayscale printing never depends on hue alone).
 *
 * Run: npx tsx scripts/experiments/charts.ts
 * (after run-experiment.ts and analyze.ts)
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import sharp from "sharp";
import { fromCsv } from "./csv";
import { mean, stddev } from "./stats";
import {
  WIDTH,
  HEIGHT,
  COLORS,
  RATE_DASH,
  svgHeader,
  SVG_FOOTER,
  linearScale,
  yAxis,
  xAxisLabels,
  legendItem,
  legendSwatch,
  linePath,
  bandPath,
  esc,
} from "./svg-charts";

const OUT_DIR = path.resolve(process.cwd(), "experiments/output");
const CHARTS_DIR = path.join(OUT_DIR, "charts");

const RATE_LABELS: Record<string, { label: string; color: string; dash?: string }> = {
  "0.05": { label: "low (0.05)", color: COLORS.rateLow, dash: RATE_DASH.low },
  "0.25": { label: "moderate (0.25, live default)", color: COLORS.rateModerate, dash: RATE_DASH.moderate },
  "0.6": { label: "high (0.6)", color: COLORS.rateHigh, dash: RATE_DASH.high },
};
const RATE_ORDER = ["0.05", "0.25", "0.6"];

type GenRow = {
  run_id: string;
  regime: string;
  mutation_rate: string;
  generation: number;
  best_train_fitness: number;
  champion_test_return_pct: number;
  fitness_variance: number;
};

function loadGenerations(): GenRow[] {
  const rows = fromCsv(readFileSync(path.join(OUT_DIR, "generations.csv"), "utf8"));
  return rows.map((r) => ({
    run_id: r.run_id,
    regime: r.regime,
    mutation_rate: r.mutation_rate,
    generation: Number(r.generation),
    best_train_fitness: Number(r.best_train_fitness),
    champion_test_return_pct: Number(r.champion_test_return_pct),
    fitness_variance: Number(r.fitness_variance),
  }));
}

async function savePng(svg: string, filename: string) {
  mkdirSync(CHARTS_DIR, { recursive: true });
  const outPath = path.join(CHARTS_DIR, filename);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`  -> ${outPath}`);
}

// ── 1. learning_curve.png — 2-panel: train fitness + test return, one line per rate ──
async function learningCurve(genRows: GenRow[]) {
  const main = genRows.filter((r) => r.regime !== "crash");
  const generations = Array.from(new Set(main.map((r) => r.generation))).sort((a, b) => a - b);

  function seriesFor(metric: "best_train_fitness" | "champion_test_return_pct") {
    const series: Record<string, { gen: number; mean: number; std: number }[]> = {};
    for (const rate of RATE_ORDER) series[rate] = [];
    for (const gen of generations) {
      for (const rate of RATE_ORDER) {
        const vals = main.filter((r) => r.mutation_rate === rate && r.generation === gen).map((r) => r[metric]);
        series[rate].push({ gen, mean: mean(vals), std: stddev(vals) });
      }
    }
    return series;
  }

  const trainSeries = seriesFor("best_train_fitness");
  const testSeries = seriesFor("champion_test_return_pct");

  const margin = { top: 70, right: 300, bottom: 70, left: 90 };
  const plotWidth = WIDTH - margin.left - margin.right;
  const panelH = 360;
  const gapBetweenPanels = 90;

  const scaleX = linearScale([1, 50], [margin.left, margin.left + plotWidth]);

  function renderPanel(
    panelTop: number,
    title: string,
    yUnit: string,
    series: Record<string, { gen: number; mean: number; std: number }[]>,
    yDomain: [number, number]
  ): string {
    const pMargin = { ...margin, top: panelTop };
    const scaleY = linearScale(yDomain, [panelTop + panelH, panelTop]);
    let out = `<text x="${margin.left}" y="${panelTop - 14}" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="${COLORS.ink}">${esc(
      title
    )}</text>`;
    out += yAxis(pMargin, panelH, yDomain, "", 5);
    out += xAxisLabels(
      pMargin,
      plotWidth,
      panelH,
      [1, 10, 20, 30, 40, 50].map((g) => ({ x: scaleX(g), text: String(g) })),
      "Generation"
    );
    for (const rate of RATE_ORDER) {
      const meta = RATE_LABELS[rate];
      const pts = series[rate].map((d) => ({ x: scaleX(d.gen), y: scaleY(d.mean) }));
      const upper = series[rate].map((d) => ({ x: scaleX(d.gen), y: scaleY(d.mean + d.std) }));
      const lower = series[rate].map((d) => ({ x: scaleX(d.gen), y: scaleY(d.mean - d.std) }));
      out += `<path d="${bandPath(upper, lower)}" fill="${meta.color}" opacity="0.12" />`;
      out += `<path d="${linePath(pts)}" fill="none" stroke="${meta.color}" stroke-width="2.5" stroke-dasharray="${meta.dash ?? ""}" />`;
    }
    out += `<text x="${margin.left - 60}" y="${panelTop + panelH / 2}" font-family="system-ui, sans-serif" font-size="13" fill="${COLORS.inkSecondary}" text-anchor="middle" transform="rotate(-90 ${
      margin.left - 60
    } ${panelTop + panelH / 2})">${esc(yUnit)}</text>`;
    return out;
  }

  const trainVals = RATE_ORDER.flatMap((r) => trainSeries[r].flatMap((d) => [d.mean - d.std, d.mean + d.std]));
  const testVals = RATE_ORDER.flatMap((r) => testSeries[r].flatMap((d) => [d.mean - d.std, d.mean + d.std]));
  const trainDomain: [number, number] = [Math.min(...trainVals), Math.max(...trainVals)];
  const testDomain: [number, number] = [Math.min(...testVals), Math.max(...testVals)];

  let svg = svgHeader(
    "Learning curve — main experiment",
    "Mean best train fitness and mean champion unseen-data test return across generations, shaded band = +/-1 SD across all 9 regime windows x 10 seeds"
  );
  svg += renderPanel(margin.top + 50, "Best train fitness (equity multiplier)", "fitness", trainSeries, trainDomain);
  svg += renderPanel(margin.top + 50 + panelH + gapBetweenPanels, "Champion equity on unseen test data (% return)", "% return", testSeries, testDomain);

  const legendX = WIDTH - margin.right + 40;
  let ly = margin.top + 40;
  svg += `<text x="${legendX}" y="${ly - 16}" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="${COLORS.ink}">Mutation rate</text>`;
  for (const rate of RATE_ORDER) {
    svg += legendItem(legendX, ly, RATE_LABELS[rate].color, RATE_LABELS[rate].label, RATE_LABELS[rate].dash);
    ly += 28;
  }
  svg += SVG_FOOTER;
  await savePng(svg, "learning_curve.png");
}

// ── 2. final_vs_baselines.png — grouped bars per regime ──
type Stats = any;
async function finalVsBaselines(statistics: any) {
  const regimes: string[] = statistics.regimes;
  const categories = [
    { key: "gen1", label: "Gen-1 champion", color: COLORS.gen1 },
    { key: "0.05", label: "Final (low)", color: COLORS.rateLow },
    { key: "0.25", label: "Final (moderate)", color: COLORS.rateModerate },
    { key: "0.6", label: "Final (high)", color: COLORS.rateHigh },
    { key: "buyhold", label: "Buy & hold", color: COLORS.buyHold },
  ];

  const margin = { top: 90, right: 280, bottom: 90, left: 100 };
  const plotWidth = WIDTH - margin.left - margin.right;
  const plotHeight = HEIGHT - margin.top - margin.bottom;

  type Bar = { label: string; color: string; mean: number; std: number };
  const groups: { regime: string; bars: Bar[] }[] = regimes.map((regime) => {
    const byRegime = statistics.byRegime[regime];
    const bars: Bar[] = categories.map((c) => {
      if (c.key === "gen1") return { label: c.label, color: c.color, mean: byRegime.gen1ReturnPct.mean, std: byRegime.gen1ReturnPct.std };
      if (c.key === "buyhold") return { label: c.label, color: c.color, mean: byRegime.buyHoldReturnPct.mean, std: byRegime.buyHoldReturnPct.std };
      const rr = statistics.byRateRegime[c.key][regime];
      return { label: c.label, color: c.color, mean: rr.finalReturnPct.mean, std: rr.finalReturnPct.std };
    });
    return { regime, bars };
  });

  const allVals = groups.flatMap((g) => g.bars.flatMap((b) => [b.mean - b.std, b.mean + b.std, 0]));
  const yDomain: [number, number] = [Math.min(...allVals), Math.max(...allVals)];
  const scaleY = linearScale(yDomain, [plotHeight, 0]);
  const zeroY = margin.top + scaleY(0);

  let svg = svgHeader("Final champion vs baselines, by market regime", "Mean test-data return %, error bars = +/-1 SD across 3 windows x 10 seeds per bar");
  svg += yAxis(margin, plotHeight, yDomain, "%", 6, "Test return (%)");

  const groupWidth = plotWidth / groups.length;
  const barGap = 6;
  const barWidth = (groupWidth - barGap * (categories.length + 1)) / categories.length;

  groups.forEach((g, gi) => {
    const groupX = margin.left + gi * groupWidth;
    g.bars.forEach((bar, bi) => {
      const barX = groupX + barGap + bi * (barWidth + barGap);
      const barY0 = margin.top + scaleY(Math.max(bar.mean, 0));
      const barY1 = margin.top + scaleY(Math.min(bar.mean, 0));
      const h = Math.max(1, barY1 - barY0);
      svg += `<rect x="${barX.toFixed(1)}" y="${barY0.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" fill="${bar.color}" />`;
      const errTop = margin.top + scaleY(bar.mean + bar.std);
      const errBot = margin.top + scaleY(bar.mean - bar.std);
      const cx = barX + barWidth / 2;
      svg += `<line x1="${cx}" y1="${errTop.toFixed(1)}" x2="${cx}" y2="${errBot.toFixed(1)}" stroke="${COLORS.ink}" stroke-width="1.2" />`;
      svg += `<line x1="${cx - 5}" y1="${errTop.toFixed(1)}" x2="${cx + 5}" y2="${errTop.toFixed(1)}" stroke="${COLORS.ink}" stroke-width="1.2" />`;
      svg += `<line x1="${cx - 5}" y1="${errBot.toFixed(1)}" x2="${cx + 5}" y2="${errBot.toFixed(1)}" stroke="${COLORS.ink}" stroke-width="1.2" />`;
    });
    svg += `<text x="${(groupX + groupWidth / 2).toFixed(1)}" y="${margin.top + plotHeight + 30}" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="${
      COLORS.ink
    }" text-anchor="middle">${esc(g.regime)}</text>`;
  });
  svg += `<line x1="${margin.left}" y1="${zeroY.toFixed(1)}" x2="${WIDTH - margin.right}" y2="${zeroY.toFixed(1)}" stroke="${COLORS.baseline}" stroke-width="1.5" />`;

  const legendX = WIDTH - margin.right + 40;
  let ly = margin.top + 20;
  for (const c of categories) {
    svg += legendSwatch(legendX, ly, c.color, c.label);
    ly += 30;
  }
  svg += SVG_FOOTER;
  await savePng(svg, "final_vs_baselines.png");
}

// ── 3. drawdown_by_mutation.png — mean final max drawdown per rate, per regime ──
async function drawdownByMutation(statistics: any) {
  const regimes: string[] = statistics.regimes;
  const margin = { top: 90, right: 260, bottom: 90, left: 100 };
  const plotWidth = WIDTH - margin.left - margin.right;
  const plotHeight = HEIGHT - margin.top - margin.bottom;

  type Bar = { label: string; color: string; value: number };
  const groups: { regime: string; bars: Bar[] }[] = regimes.map((regime) => ({
    regime,
    bars: RATE_ORDER.map((rate) => ({
      label: RATE_LABELS[rate].label,
      color: RATE_LABELS[rate].color,
      value: statistics.byRateRegime[rate][regime].meanMaxDrawdownPct,
    })),
  }));

  const maxVal = Math.max(...groups.flatMap((g) => g.bars.map((b) => b.value)));
  const yDomain: [number, number] = [0, maxVal * 1.15];
  const scaleY = linearScale(yDomain, [plotHeight, 0]);

  let svg = svgHeader("Mean max drawdown by mutation rate and regime", "Final (best-ever) champion's peak-to-trough drawdown on test data, mean across 3 windows x 10 seeds");
  svg += yAxis(margin, plotHeight, yDomain, "%", 5, "Max drawdown (%)");

  const groupWidth = plotWidth / groups.length;
  const barGap = 10;
  const barWidth = (groupWidth - barGap * (RATE_ORDER.length + 1)) / RATE_ORDER.length;

  groups.forEach((g, gi) => {
    const groupX = margin.left + gi * groupWidth;
    g.bars.forEach((bar, bi) => {
      const barX = groupX + barGap + bi * (barWidth + barGap);
      const barY = margin.top + scaleY(bar.value);
      const h = margin.top + plotHeight - barY;
      svg += `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" fill="${bar.color}" />`;
      svg += `<text x="${(barX + barWidth / 2).toFixed(1)}" y="${(barY - 8).toFixed(1)}" font-family="system-ui, sans-serif" font-size="12" fill="${COLORS.inkSecondary}" text-anchor="middle">${bar.value.toFixed(
        1
      )}%</text>`;
    });
    svg += `<text x="${(groupX + groupWidth / 2).toFixed(1)}" y="${margin.top + plotHeight + 30}" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="${
      COLORS.ink
    }" text-anchor="middle">${esc(g.regime)}</text>`;
  });

  const legendX = WIDTH - margin.right + 40;
  let ly = margin.top + 20;
  for (const rate of RATE_ORDER) {
    svg += legendSwatch(legendX, ly, RATE_LABELS[rate].color, RATE_LABELS[rate].label);
    ly += 30;
  }
  svg += SVG_FOOTER;
  await savePng(svg, "drawdown_by_mutation.png");
}

// ── 4. convergence.png — mean fitness variance across generations, one line per rate ──
async function convergence(genRows: GenRow[]) {
  const main = genRows.filter((r) => r.regime !== "crash");
  const generations = Array.from(new Set(main.map((r) => r.generation))).sort((a, b) => a - b);

  const series: Record<string, { gen: number; mean: number }[]> = {};
  for (const rate of RATE_ORDER) series[rate] = [];
  for (const gen of generations) {
    for (const rate of RATE_ORDER) {
      const vals = main.filter((r) => r.mutation_rate === rate && r.generation === gen).map((r) => r.fitness_variance);
      series[rate].push({ gen, mean: mean(vals) });
    }
  }

  const margin = { top: 90, right: 280, bottom: 90, left: 100 };
  const plotWidth = WIDTH - margin.left - margin.right;
  const plotHeight = HEIGHT - margin.top - margin.bottom;
  const scaleX = linearScale([1, 50], [margin.left, margin.left + plotWidth]);
  const allVals = RATE_ORDER.flatMap((r) => series[r].map((d) => d.mean));
  const yDomain: [number, number] = [0, Math.max(...allVals) * 1.1];
  const scaleY = linearScale(yDomain, [plotHeight, 0]);

  let svg = svgHeader("Population fitness variance across generations", "Mean across all 9 regime windows x 10 seeds — falling variance signals the population converging toward one strategy");
  svg += yAxis(margin, plotHeight, yDomain, "", 5, "Fitness variance");
  svg += xAxisLabels(margin, plotWidth, plotHeight, [1, 10, 20, 30, 40, 50].map((g) => ({ x: scaleX(g), text: String(g) })), "Generation");

  for (const rate of RATE_ORDER) {
    const meta = RATE_LABELS[rate];
    const pts = series[rate].map((d) => ({ x: scaleX(d.gen), y: margin.top + scaleY(d.mean) }));
    svg += `<path d="${linePath(pts)}" fill="none" stroke="${meta.color}" stroke-width="2.5" stroke-dasharray="${meta.dash ?? ""}" />`;
  }

  const legendX = WIDTH - margin.right + 40;
  let ly = margin.top + 20;
  for (const rate of RATE_ORDER) {
    svg += legendItem(legendX, ly, RATE_LABELS[rate].color, RATE_LABELS[rate].label, RATE_LABELS[rate].dash);
    ly += 28;
  }
  svg += SVG_FOOTER;
  await savePng(svg, "convergence.png");
}

// ── 5. crash_test.png — per crash: gen-1, final (per rate), buy & hold ──
async function crashTest(statistics: any) {
  const crashWindows: string[] = statistics.crashWindows;
  const crashLabels: Record<string, string> = {
    crash_covid_2020: "COVID crash (Mar 2020)",
    crash_terra_luna_2022: "Terra/Luna (May 2022)",
    crash_ftx_2022: "FTX collapse (Nov 2022)",
  };
  const categories = [
    { key: "gen1", label: "Gen-1 champion", color: COLORS.gen1 },
    { key: "0.05", label: "Final (low)", color: COLORS.rateLow },
    { key: "0.25", label: "Final (moderate)", color: COLORS.rateModerate },
    { key: "0.6", label: "Final (high)", color: COLORS.rateHigh },
    { key: "buyhold", label: "Buy & hold", color: COLORS.buyHold },
  ];

  const margin = { top: 90, right: 280, bottom: 90, left: 100 };
  const plotWidth = WIDTH - margin.left - margin.right;
  const plotHeight = HEIGHT - margin.top - margin.bottom;

  type Bar = { label: string; color: string; mean: number; std: number };
  const groups: { window: string; bars: Bar[] }[] = crashWindows.map((w) => {
    const anyRate = statistics.crashByWindowAndRate[w]["0.25"];
    const bars: Bar[] = categories.map((c) => {
      if (c.key === "gen1") return { label: c.label, color: c.color, mean: anyRate.gen1ReturnPct.mean, std: anyRate.gen1ReturnPct.std };
      if (c.key === "buyhold") return { label: c.label, color: c.color, mean: anyRate.buyHoldReturnPct.mean, std: anyRate.buyHoldReturnPct.std };
      const rr = statistics.crashByWindowAndRate[w][c.key];
      return { label: c.label, color: c.color, mean: rr.finalReturnPct.mean, std: rr.finalReturnPct.std };
    });
    return { window: w, bars };
  });

  const allVals = groups.flatMap((g) => g.bars.flatMap((b) => [b.mean - b.std, b.mean + b.std, 0]));
  const yDomain: [number, number] = [Math.min(...allVals), Math.max(...allVals)];
  const scaleY = linearScale(yDomain, [plotHeight, 0]);
  const zeroY = margin.top + scaleY(0);

  let svg = svgHeader("Crash stress test — champion vs buy & hold", "Mean test-data return % during each historical crash, error bars = +/-1 SD across 10 seeds per bar (separate from the main 270-run experiment)");
  svg += yAxis(margin, plotHeight, yDomain, "%", 6, "Test return (%)");

  const groupWidth = plotWidth / groups.length;
  const barGap = 6;
  const barWidth = (groupWidth - barGap * (categories.length + 1)) / categories.length;

  groups.forEach((g, gi) => {
    const groupX = margin.left + gi * groupWidth;
    g.bars.forEach((bar, bi) => {
      const barX = groupX + barGap + bi * (barWidth + barGap);
      const barY0 = margin.top + scaleY(Math.max(bar.mean, 0));
      const barY1 = margin.top + scaleY(Math.min(bar.mean, 0));
      const h = Math.max(1, barY1 - barY0);
      svg += `<rect x="${barX.toFixed(1)}" y="${barY0.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" fill="${bar.color}" />`;
      const errTop = margin.top + scaleY(bar.mean + bar.std);
      const errBot = margin.top + scaleY(bar.mean - bar.std);
      const cx = barX + barWidth / 2;
      svg += `<line x1="${cx}" y1="${errTop.toFixed(1)}" x2="${cx}" y2="${errBot.toFixed(1)}" stroke="${COLORS.ink}" stroke-width="1.2" />`;
    });
    svg += `<text x="${(groupX + groupWidth / 2).toFixed(1)}" y="${margin.top + plotHeight + 30}" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="${
      COLORS.ink
    }" text-anchor="middle">${esc(crashLabels[g.window] ?? g.window)}</text>`;
  });
  svg += `<line x1="${margin.left}" y1="${zeroY.toFixed(1)}" x2="${WIDTH - margin.right}" y2="${zeroY.toFixed(1)}" stroke="${COLORS.baseline}" stroke-width="1.5" />`;

  const legendX = WIDTH - margin.right + 40;
  let ly = margin.top + 20;
  for (const c of categories) {
    svg += legendSwatch(legendX, ly, c.color, c.label);
    ly += 30;
  }
  svg += SVG_FOOTER;
  await savePng(svg, "crash_test.png");
}

async function main() {
  console.log("Loading data...");
  const genRows = loadGenerations();
  const statistics = JSON.parse(readFileSync(path.join(OUT_DIR, "statistics.json"), "utf8"));

  console.log("Rendering charts...");
  await learningCurve(genRows);
  await finalVsBaselines(statistics);
  await drawdownByMutation(statistics);
  await convergence(genRows);
  await crashTest(statistics);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
