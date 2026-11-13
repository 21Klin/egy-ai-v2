"use client";

/**
 * CROSS-TAB LEADER ELECTION + COMMAND RELAY for the GA bot singleton.
 * ------------------------------------------------------------------
 * useGaStore (ga-store.ts) is a per-TAB module — opening the app in two
 * browser tabs gives each its own JS context and therefore its own
 * Zustand instance. Left alone, both tabs would run their own copy of
 * the engine against the same account: two independent populations,
 * double Firestore writes, Start/Stop in one tab doing nothing visible
 * in the other. That's "looks like separate bots."
 *
 * The fix: exactly one open tab per account is the "leader" and runs
 * the real engine; every other tab is a "follower" that mirrors the
 * leader's state (via the localStorage snapshot + the browser's own
 * `storage` event — see ga-store.ts) and relays user actions (Start,
 * Stop, Reset, Step, speed) to the leader over a BroadcastChannel
 * instead of acting on them directly.
 *
 * Leadership uses the Web Locks API where available (Chrome/Edge/
 * Firefox/Safari 15.4+): a lock is requested once and held for the
 * tab's whole lifetime, and the browser releases it automatically the
 * instant the tab closes or crashes — so the "next" open tab picks up
 * leadership with no heartbeat/timeout logic and no risk of two tabs
 * ever believing they're both leader. Where Web Locks isn't available,
 * falls back to a simple localStorage heartbeat lock.
 */

export type GaCommandAction = "start" | "stop" | "resetRun" | "step" | "setDemoMode";

export type GaChannelMessage = {
  type: "command";
  action: GaCommandAction;
  payload?: unknown;
};

const FALLBACK_HEARTBEAT_MS = 2000;
const FALLBACK_STALE_AFTER_MS = 5000;

function fallbackLockKey(owner: string) {
  return `egy_ga_leader_fallback_v1:${owner}`;
}

/** Only used when navigator.locks is unavailable (very old browsers). */
function acquireFallbackLock(owner: string, onBecomeLeader: () => void, onLoseLeadership: () => void): () => void {
  const tabId = Math.random().toString(36).slice(2);
  const key = fallbackLockKey(owner);
  let isLeader = false;
  let heartbeatId: ReturnType<typeof setInterval> | null = null;

  const readLock = (): { tabId: string; ts: number } | null => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const writeLock = () => {
    try {
      localStorage.setItem(key, JSON.stringify({ tabId, ts: Date.now() }));
    } catch {
      // ignore (private browsing, quota, etc.)
    }
  };

  const tryBecomeLeader = () => {
    if (isLeader) return;
    const current = readLock();
    if (current && Date.now() - current.ts < FALLBACK_STALE_AFTER_MS) return; // someone else holds it
    writeLock();
    // Optimistic write — confirm nobody else wrote in the same instant
    // before actually committing to leadership.
    setTimeout(() => {
      const confirmed = readLock();
      if (!isLeader && confirmed?.tabId === tabId) {
        isLeader = true;
        heartbeatId = setInterval(() => {
          if (isLeader) writeLock();
        }, FALLBACK_HEARTBEAT_MS);
        onBecomeLeader();
      }
    }, 150);
  };

  const pollId = setInterval(tryBecomeLeader, FALLBACK_HEARTBEAT_MS);

  const release = () => {
    clearInterval(pollId);
    if (heartbeatId) clearInterval(heartbeatId);
    if (isLeader) {
      isLeader = false;
      try {
        const current = readLock();
        if (current?.tabId === tabId) localStorage.removeItem(key);
      } catch {
        // ignore
      }
      onLoseLeadership();
    }
    window.removeEventListener("beforeunload", release);
  };

  window.addEventListener("beforeunload", release);
  tryBecomeLeader();
  return release;
}

/**
 * Attempts to become the leader for `owner`. Calls onBecomeLeader as soon
 * as this tab wins leadership, and onLoseLeadership if it's later lost
 * (voluntary release via the returned function, the tab closing, or —
 * fallback mode only — another tab's heartbeat winning after this one
 * goes stale, e.g. this tab was backgrounded/throttled).
 *
 * Returns a function that voluntarily releases leadership — call it when
 * switching accounts (so the old owner's lock frees up immediately for
 * any other open tab on that account) or tearing the store down.
 */
export function acquireLeadership(owner: string, onBecomeLeader: () => void, onLoseLeadership: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  if (typeof navigator !== "undefined" && "locks" in navigator && navigator.locks) {
    let active = true;
    let resolveReleased: () => void = () => {};
    const released = new Promise<void>((resolve) => {
      resolveReleased = resolve;
    });

    navigator.locks
      .request(`egy-ga-leader-v1:${owner}`, { mode: "exclusive" }, async () => {
        if (!active) return; // released before the lock was even granted — give it up immediately
        onBecomeLeader();
        await released;
        onLoseLeadership();
      })
      .catch(() => {
        // Request itself failed/aborted — nothing to clean up.
      });

    return () => {
      active = false;
      resolveReleased();
    };
  }

  return acquireFallbackLock(owner, onBecomeLeader, onLoseLeadership);
}

/** One BroadcastChannel per account, used to relay commands from followers to the leader. */
export function createGaChannel(owner: string): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  try {
    return new BroadcastChannel(`egy-ga-bot-v1:${owner}`);
  } catch {
    return null;
  }
}

export function sendGaCommand(channel: BroadcastChannel | null, action: GaCommandAction, payload?: unknown): void {
  if (!channel) return;
  const message: GaChannelMessage = { type: "command", action, payload };
  channel.postMessage(message);
}
