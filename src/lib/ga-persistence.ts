/**
 * GA RUN PERSISTENCE — Firestore mirror of the bot's state.
 * ------------------------------------------------------------------
 * users/{uid}/gaRuns/{runId}            — run metadata + the current
 *                                          "live" state (population,
 *                                          graveyard, quarantine, ...),
 *                                          overwritten every generation.
 * users/{uid}/gaRuns/{runId}/generations/{gen}
 *                                        — one append-only doc per
 *                                          generation (never rewritten):
 *                                          the audit trail a learning-
 *                                          curve chart (and the /ga-demo
 *                                          replay feature) reads from.
 *
 * This is a mirror, not the source of truth for a single session — the
 * in-memory store + its localStorage snapshot stay authoritative while
 * the tab is open, since the bot must keep working offline or before
 * these Firestore writes land. Every call here is meant to be wrapped
 * in a try/catch by the caller (ga-store.ts) and treated as best-effort.
 */

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "./firestore";
import type { Genome, GenerationHistoryEntry, GraveyardEntry, Individual } from "./ga-engine";
import { POPULATION_SIZE, ELITE_COUNT, IMMIGRANT_COUNT, QUARANTINE_SIMILARITY_THRESHOLD } from "./ga-engine";

type Signal = { action: "buy" | "sell" | "hold"; price: number; time: number };
type LogEntry = { time: number; message: string };

export interface GaRunLiveState {
  generation: number;
  population: Individual[];
  bestEverFitness: number | null;
  bestEverGenome: Genome;
  firstChampionGenome: Genome | null;
  lastSignal: Signal | null;
  log: LogEntry[];
  graveyard: GraveyardEntry[];
  quarantine: GraveyardEntry[];
  repeatsBlockedTotal: number;
  strategiesCreatedTotal: number;
  eliminatedTotal: number;
  quarantinedTotal: number;
}

export interface GenerationDoc {
  generation: number;
  timestamp: number;
  population: Individual[];
  bestFitness: number;
  avgFitness: number;
  worstFitness: number;
  bestGenome: Genome;
  testEquity: number;
  buyAndHoldEquity: number;
  diversity: number;
  eliminated: GraveyardEntry[];
  blockedCount: number;
}

export interface RunSummary {
  runId: string;
  startedAt: number;
  updatedAt: number;
  status: string;
  generation: number;
}

function runsCol(uid: string) {
  return collection(db, "users", uid, "gaRuns");
}

function runDocRef(uid: string, runId: string) {
  return doc(db, "users", uid, "gaRuns", runId);
}

function generationsCol(uid: string, runId: string) {
  return collection(db, "users", uid, "gaRuns", runId, "generations");
}

/** Starts a brand-new run doc and returns its id. */
export async function createRun(uid: string): Promise<string> {
  const ref = doc(runsCol(uid));
  await setDoc(ref, {
    runId: ref.id,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    status: "active",
    config: {
      populationSize: POPULATION_SIZE,
      eliteCount: ELITE_COUNT,
      immigrantCount: IMMIGRANT_COUNT,
      quarantineSimilarityThreshold: QUARANTINE_SIMILARITY_THRESHOLD,
    },
    generation: 0,
    population: [],
    bestEverFitness: null,
    bestEverGenome: null,
    firstChampionGenome: null,
    lastSignal: null,
    log: [],
    graveyard: [],
    quarantine: [],
    repeatsBlockedTotal: 0,
    strategiesCreatedTotal: POPULATION_SIZE,
    eliminatedTotal: 0,
    quarantinedTotal: 0,
  });
  return ref.id;
}

/** Overwrites the run doc's "live state" fields — one write, every generation. */
export async function saveRunState(uid: string, runId: string, state: GaRunLiveState): Promise<void> {
  await setDoc(runDocRef(uid, runId), { ...state, updatedAt: Date.now() }, { merge: true });
}

/** Appends (never overwrites) this generation's audit record. */
export async function appendGenerationDoc(uid: string, runId: string, entry: GenerationDoc): Promise<void> {
  await setDoc(doc(generationsCol(uid, runId), String(entry.generation)), entry);
}

/**
 * Restores the most recently started run: its live state plus up to the
 * last 50 generation docs (reconstructed into a GenerationHistoryEntry[])
 * so the learning-curve chart has real data immediately on reload, not
 * just whatever this browser's localStorage happened to still have.
 */
export async function getLatestRun(
  uid: string
): Promise<{
  runId: string;
  state: GaRunLiveState;
  recentHistory: GenerationHistoryEntry[];
  recentGenerations: { generation: number; population: Individual[] }[];
} | null> {
  const runQuery = query(runsCol(uid), orderBy("startedAt", "desc"), limit(1));
  const runSnap = await getDocs(runQuery);
  if (runSnap.empty) return null;

  const runDoc = runSnap.docs[0];
  const data = runDoc.data();
  const runId = runDoc.id;

  const state: GaRunLiveState = {
    generation: data.generation ?? 0,
    population: data.population ?? [],
    bestEverFitness: data.bestEverFitness ?? null,
    bestEverGenome: data.bestEverGenome,
    firstChampionGenome: data.firstChampionGenome ?? null,
    lastSignal: data.lastSignal ?? null,
    log: data.log ?? [],
    graveyard: data.graveyard ?? [],
    quarantine: data.quarantine ?? [],
    repeatsBlockedTotal: data.repeatsBlockedTotal ?? 0,
    strategiesCreatedTotal: data.strategiesCreatedTotal ?? POPULATION_SIZE,
    eliminatedTotal: data.eliminatedTotal ?? 0,
    quarantinedTotal: data.quarantinedTotal ?? 0,
  };

  const genQuery = query(generationsCol(uid, runId), orderBy("generation", "desc"), limit(50));
  const genSnap = await getDocs(genQuery);
  const genDocs = genSnap.docs.map((d) => d.data() as GenerationDoc).sort((a, b) => a.generation - b.generation);

  const recentHistory: GenerationHistoryEntry[] = genDocs.map((g) => ({
    generation: g.generation,
    bestFitness: g.bestFitness,
    avgFitness: g.avgFitness,
    worstFitness: g.worstFitness,
    bestGenome: g.bestGenome,
    testEquity: g.testEquity,
    buyAndHoldEquity: g.buyAndHoldEquity,
    diversity: g.diversity,
    blockedCount: g.blockedCount,
  }));

  // The lineage tree only needs the last ~16 generations, not all 50.
  const recentGenerations = genDocs.slice(-16).map((g) => ({ generation: g.generation, population: g.population }));

  return { runId, state, recentHistory, recentGenerations };
}

/** Every run this account has ever started, newest first — for the /ga-demo replay picker. */
export async function listRuns(uid: string): Promise<RunSummary[]> {
  const q = query(runsCol(uid), orderBy("startedAt", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      runId: d.id,
      startedAt: data.startedAt ?? 0,
      updatedAt: data.updatedAt ?? 0,
      status: data.status ?? "active",
      generation: data.generation ?? 0,
    };
  });
}

/** Every generation doc for one run, oldest first — the full timeline /ga-demo replays. */
export async function getRunGenerations(uid: string, runId: string): Promise<GenerationDoc[]> {
  const q = query(generationsCol(uid, runId), orderBy("generation", "asc"), limit(1000));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as GenerationDoc);
}
