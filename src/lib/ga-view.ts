/**
 * GA VIEW STATE — a shape the /ga-demo page can render regardless of
 * whether the data is coming from the LIVE singleton store (ga-store.ts)
 * or from a REPLAYED saved run (ga-persistence.ts generation docs).
 *
 * Every display component on /ga-demo (narration, evolution tree, learning
 * curve, report card) takes a GaViewState, not "the live store" directly —
 * that's what lets Replay reuse the exact same UI instead of a second,
 * parallel set of components.
 */

import { POPULATION_SIZE } from "./ga-engine";
import type { Genome, GenerationHistoryEntry, GraveyardEntry, Individual } from "./ga-engine";
import type { RecentGeneration } from "./ga-store";
import type { GenerationDoc } from "./ga-persistence";

export interface GaViewState {
  generation: number;
  /** The current, not-yet-evaluated population (the tree's "newborn" column). Always [] in replay — every replay column is already-evaluated history. */
  population: Individual[];
  bestEverFitness: number | null;
  bestEverGenome: Genome | null;
  firstChampionGenome: Genome | null;
  history: GenerationHistoryEntry[];
  diversity: number;
  graveyard: GraveyardEntry[];
  quarantine: GraveyardEntry[];
  repeatsBlockedTotal: number;
  strategiesCreatedTotal: number;
  eliminatedTotal: number;
  quarantinedTotal: number;
  recentGenerations: RecentGeneration[];
}

const MAX_GRAVEYARD_SIZE = 200;
const MAX_QUARANTINE_SIZE = 150;
const MAX_RECENT_GENERATIONS = 16;

export const EMPTY_GA_VIEW_STATE: GaViewState = {
  generation: 0,
  population: [],
  bestEverFitness: null,
  bestEverGenome: null,
  firstChampionGenome: null,
  history: [],
  diversity: 0,
  graveyard: [],
  quarantine: [],
  repeatsBlockedTotal: 0,
  strategiesCreatedTotal: 0,
  eliminatedTotal: 0,
  quarantinedTotal: 0,
  recentGenerations: [],
};

/**
 * Reconstructs the view at `uptoIndex` (inclusive) from a saved run's real
 * per-generation audit docs. Every number here is real — summed/maxed from
 * what the engine actually recorded — never invented for the replay.
 */
export function deriveReplayState(docs: GenerationDoc[], uptoIndex: number): GaViewState {
  const slice = docs.slice(0, Math.max(0, uptoIndex) + 1);
  if (slice.length === 0) return EMPTY_GA_VIEW_STATE;

  let bestEverFitness: number | null = null;
  let bestEverGenome: Genome | null = null;
  let strategiesCreatedTotal = POPULATION_SIZE; // generation 0's initial random population, same as a fresh live run
  let eliminatedTotal = 0;
  let quarantinedTotal = 0;
  let repeatsBlockedTotal = 0;
  const graveyard: GraveyardEntry[] = [];
  const quarantine: GraveyardEntry[] = [];

  for (const doc of slice) {
    if (bestEverFitness === null || doc.bestFitness > bestEverFitness) {
      bestEverFitness = doc.bestFitness;
      bestEverGenome = doc.bestGenome;
    }
    strategiesCreatedTotal += doc.population.length;
    eliminatedTotal += doc.eliminated.length;
    repeatsBlockedTotal += doc.blockedCount;
    graveyard.push(...doc.eliminated);
    const newlyQuarantined = doc.eliminated.filter((e) => e.reason !== "outcompeted");
    quarantinedTotal += newlyQuarantined.length;
    quarantine.push(...newlyQuarantined);
  }

  const firstDoc = docs.find((d) => d.generation === 1) ?? slice[0];
  const last = slice[slice.length - 1];

  return {
    generation: last.generation,
    population: [],
    bestEverFitness,
    bestEverGenome,
    firstChampionGenome: firstDoc.bestGenome,
    history: slice.map((d) => ({
      generation: d.generation,
      bestFitness: d.bestFitness,
      avgFitness: d.avgFitness,
      worstFitness: d.worstFitness,
      bestGenome: d.bestGenome,
      testEquity: d.testEquity,
      buyAndHoldEquity: d.buyAndHoldEquity,
      diversity: d.diversity,
      blockedCount: d.blockedCount,
    })),
    diversity: last.diversity,
    graveyard: graveyard.slice(-MAX_GRAVEYARD_SIZE),
    quarantine: quarantine.slice(-MAX_QUARANTINE_SIZE),
    repeatsBlockedTotal,
    strategiesCreatedTotal,
    eliminatedTotal,
    quarantinedTotal,
    recentGenerations: slice.slice(-MAX_RECENT_GENERATIONS).map((d) => ({ generation: d.generation, population: d.population })),
  };
}
