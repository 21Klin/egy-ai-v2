"use client";

import { useGaStore } from "@/lib/ga-store";

/**
 * The one "Bot: Running · Run <id> · Generation N" indicator, used
 * identically on /trading, /ga-dashboard and /ga-demo — all three read the
 * exact same useGaStore singleton, so whichever tab/page you're looking at,
 * this always shows the same bot's real state (synced across tabs too; see
 * ga-store.ts / ga-leader.ts).
 */
export default function BotStatusBadge({ className = "" }: { className?: string }) {
  const running = useGaStore((s) => s.running);
  const generation = useGaStore((s) => s.generation);
  const runId = useGaStore((s) => s.runId);
  const loadingHistory = useGaStore((s) => s.loadingHistory);

  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 font-data text-xs ${className}`}
    >
      <span className={`circuit-node ${running ? "" : "idle"}`} />
      <span className={running ? "text-emerald-300" : "text-slate-400"}>
        Bot: {loadingHistory && !running ? "Loading…" : running ? "Running" : "Paused"}
      </span>
      {runId && <span className="text-slate-600">· Run {runId.slice(0, 6)}</span>}
      <span className="text-slate-600">· Gen {generation > 0 ? generation : "—"}</span>
    </div>
  );
}
