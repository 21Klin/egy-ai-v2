/**
 * Exports experiments/output/trades.csv to trades.xlsx (frozen header row,
 * readable column widths, numeric/date/boolean typing) per EXPERIMENTS.md's
 * "a trades.xlsx export" requirement. Pure re-export of the already-generated
 * trades.csv — no numbers are recomputed here.
 *
 * Run: npx tsx scripts/experiments/export-xlsx.ts
 * (after run-experiment.ts)
 */
import { readFileSync } from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { fromCsv } from "./csv";

const OUT_DIR = path.resolve(process.cwd(), "experiments/output");

const COLUMNS: { key: string; header: string; width: number; type: "string" | "number" | "date" | "boolean" }[] = [
  { key: "run_id", header: "run_id", width: 24, type: "string" },
  { key: "regime", header: "regime", width: 12, type: "string" },
  { key: "window_id", header: "window_id", width: 20, type: "string" },
  { key: "mutation_rate", header: "mutation_rate", width: 14, type: "number" },
  { key: "seed", header: "seed", width: 8, type: "number" },
  { key: "which", header: "which", width: 16, type: "string" },
  { key: "strategy_id", header: "strategy_id", width: 14, type: "string" },
  { key: "direction", header: "direction", width: 10, type: "string" },
  { key: "entry_time_utc", header: "entry_time_utc", width: 22, type: "date" },
  { key: "entry_price", header: "entry_price", width: 14, type: "number" },
  { key: "exit_time_utc", header: "exit_time_utc", width: 22, type: "date" },
  { key: "exit_price", header: "exit_price", width: 14, type: "number" },
  { key: "return_after_fees_pct", header: "return_after_fees_pct", width: 20, type: "number" },
  { key: "win", header: "win", width: 10, type: "boolean" },
];

async function main() {
  const rows = fromCsv(readFileSync(path.join(OUT_DIR, "trades.csv"), "utf8"));

  const wb = new ExcelJS.Workbook();
  wb.creator = "experiments/export-xlsx.ts";
  wb.created = new Date();

  const ws = wb.addWorksheet("trades", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({ key: c.key, header: c.header, width: c.width }));
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  for (const r of rows) {
    const out: Record<string, unknown> = {};
    for (const c of COLUMNS) {
      const raw = r[c.key];
      if (c.type === "number") out[c.key] = raw === "" ? null : Number(raw);
      else if (c.type === "boolean") out[c.key] = raw === "true";
      else if (c.type === "date") out[c.key] = raw ? new Date(raw) : null;
      else out[c.key] = raw;
    }
    ws.addRow(out);
  }

  const dateCol = ws.getColumn("entry_time_utc");
  dateCol.numFmt = "yyyy-mm-dd hh:mm:ss";
  const exitDateCol = ws.getColumn("exit_time_utc");
  exitDateCol.numFmt = "yyyy-mm-dd hh:mm:ss";
  ws.getColumn("return_after_fees_pct").numFmt = "0.000";
  ws.getColumn("mutation_rate").numFmt = "0.00";

  const outPath = path.join(OUT_DIR, "trades.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log(`Wrote ${rows.length} rows -> ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
