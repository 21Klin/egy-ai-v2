"use client";

import { useMemo } from "react";
import type { Individual, GraveyardEntry } from "@/lib/ga-engine";
import type { RecentGeneration } from "@/lib/ga-store";

const COLUMN_WIDTH = 46;
const ROW_HEIGHT = 16;
const NODE_RADIUS = 4;
const PADDING = 20;

type NodeStyle = { fill: string; opacity: number; glow: boolean };

function nodeStyle(ind: Individual, graveyardIds: Set<string>, isLatestColumn: boolean): NodeStyle {
  if (graveyardIds.has(ind.id)) return { fill: "#e34948", opacity: 0.4, glow: false };
  if (ind.origin === "elite") return { fill: "#10b981", opacity: 1, glow: true };
  if (isLatestColumn) return { fill: "#94a3b8", opacity: 0.9, glow: false };
  return { fill: "#3987e5", opacity: 0.85, glow: false };
}

/**
 * Columns = generations (oldest to newest, left to right); the rightmost
 * column is the current, not-yet-evaluated population ("newborns"). Edges
 * connect each node to its parentIds in the previous column — real lineage
 * data from the engine, not a layout guess. Only the last ~16 generations
 * are kept in memory (see ga-store.ts), matching "stay readable."
 */
export default function EvolutionTree({
  recentGenerations,
  currentPopulation,
  currentGeneration,
  graveyard,
  onSelect,
}: {
  recentGenerations: RecentGeneration[];
  currentPopulation: Individual[];
  currentGeneration: number;
  graveyard: GraveyardEntry[];
  onSelect: (individual: Individual) => void;
}) {
  const graveyardIds = useMemo(() => new Set(graveyard.map((g) => g.id)), [graveyard]);

  const columns = useMemo(() => {
    const cols = recentGenerations.map((g) => ({ generation: g.generation, population: g.population, isLatest: false }));
    if (currentPopulation.length > 0) cols.push({ generation: currentGeneration, population: currentPopulation, isLatest: true });
    return cols;
  }, [recentGenerations, currentPopulation, currentGeneration]);

  if (columns.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-slate-500">No generations yet — start the bot to see the lineage tree.</div>;
  }

  const maxPop = Math.max(...columns.map((c) => c.population.length), 1);
  const width = columns.length * COLUMN_WIDTH + PADDING * 2;
  const height = maxPop * ROW_HEIGHT + PADDING * 2;

  // position[generation][id] = {x, y}
  const positions = columns.map((col, ci) => {
    const x = PADDING + ci * COLUMN_WIDTH + COLUMN_WIDTH / 2;
    const map = new Map<string, { x: number; y: number }>();
    col.population.forEach((ind, i) => {
      map.set(ind.id, { x, y: PADDING + i * ROW_HEIGHT + ROW_HEIGHT / 2 });
    });
    return map;
  });

  const edges: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  columns.forEach((col, ci) => {
    if (ci === 0) return;
    const prevMap = positions[ci - 1];
    const curMap = positions[ci];
    col.population.forEach((ind) => {
      const to = curMap.get(ind.id);
      if (!to) return;
      ind.parentIds.forEach((pid, pidx) => {
        const from = prevMap.get(pid);
        if (!from) return;
        // Tournament selection can legitimately pick the same parent for both
        // crossover slots, giving a child two identical parentIds entries —
        // the index keeps those two edges' keys distinct.
        edges.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, key: `${pid}->${ind.id}#${pidx}` });
      });
    });
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.6)]" /> Elite (survived)</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 opacity-40" /> Eliminated</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> Newborn (just created)</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" /> Survived (not yet classified)</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-2">
        <svg width={width} height={height} className="block">
          {edges.map((e) => (
            <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#334155" strokeWidth={0.75} opacity={0.5} />
          ))}
          {columns.map((col, ci) =>
            col.population.map((ind) => {
              const pos = positions[ci].get(ind.id)!;
              const style = nodeStyle(ind, graveyardIds, col.isLatest);
              return (
                <circle
                  key={`${ci}-${ind.id}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_RADIUS}
                  fill={style.fill}
                  opacity={style.opacity}
                  stroke={style.glow ? style.fill : "none"}
                  strokeWidth={style.glow ? 3 : 0}
                  strokeOpacity={style.glow ? 0.35 : 0}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                  onClick={() => onSelect(ind)}
                >
                  <title>{`${ind.id} · ${ind.origin}${graveyardIds.has(ind.id) ? " · eliminated" : ""}`}</title>
                </circle>
              );
            })
          )}
          {columns.map((col, ci) => (
            <text
              key={`label-${ci}-${col.generation}`}
              x={PADDING + ci * COLUMN_WIDTH + COLUMN_WIDTH / 2}
              y={height - 4}
              textAnchor="middle"
              fontSize={9}
              fill="#64748b"
              className="font-data"
            >
              g{col.generation}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
