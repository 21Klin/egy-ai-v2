# Egy AI — Competition Upgrade Brief

## Context
Egy AI is a Next.js 14 + TypeScript + Zustand + Tailwind + Recharts + Firebase (Auth + Firestore) app,
deployed on Cloudflare Pages (egy-ai.pages.dev) from GitHub repo `21Klin/egy-ai-v2`.
Its core is a genetic algorithm (GA) that evolves BTC/USDT trading strategies on real Binance candles.

It is being presented at the **FirsTep project competition (local round)**. First place goes to FirsTep Romania.
The pitch: **a bot that learns by itself**. The judges must be able to SEE, live, that:
1. strategies evolve over generations,
2. failed strategies get eliminated and isolated,
3. the bot never repeats a failed strategy,
4. the bot actually got smarter (not just memorized the data).

**Golden rule: no fake or random numbers in the UI.** Every number shown must come from the real engine.
If data is missing, show an honest empty/error state.

## Codebase audit (done before this brief)
Key files:
- `src/lib/ga-engine.ts` — GA core: genome, SMA/RSI, backtest + fitness, tournament selection, crossover, mutation, localStorage snapshot, Binance klines fetch.
- `src/lib/ga-store.ts` — Zustand singleton running the GA every 45s (`GENERATION_INTERVAL_MS`).
- `src/app/ga-dashboard/page.tsx` — GA dashboard (stat cards, best genome, top-5 bars, log).
- `src/components/trade-panel.tsx` — trading page bot; increments `gaGenerations`/`botTrades` on the user profile in Firestore.
- `src/lib/firestore.ts`, `src/lib/firebase.ts` — Firebase setup (keys from `.env.local`, gitignored).

What already works: real GA (pop 24, elite 4, tournament 5, mutation 0.25), fee-adjusted (0.1%) and
drawdown-penalized fitness, real Binance data, app builds when Firebase env vars are present.

Problems found:
1. **No real persistence.** State is only in one browser's localStorage (`egy_ga_snapshot_v1`). Log capped at 30 entries.
   No per-generation history, so no "learning over time" chart is possible.
2. **"Isolate failed strategies / never repeat mistakes" is not implemented.** Losers are silently dropped;
   new children can re-create the same bad genome.
3. **No lineage.** Individuals don't store parent IDs; ids are reused (0..23) every generation, so they aren't unique.
4. **Dead gene:** `rsiLow` evolves but is never used in the trading rule in `evaluateGenome`.
5. **No out-of-sample test.** Trains and scores on the same 500 x 1m candles. Offline test with simulated prices:
   training fitness rose 1.0085 → 1.0294 while unseen-data equity stayed flat (0.9924 → 0.9900) = overfitting.
6. **Premature convergence:** with pop 24 the population collapses into near-clones; no improvement after ~gen 10.
7. **Candles loaded once, never refreshed** (only the last close is overwritten with the live tick).
8. **Bug:** invalid genomes get fitness `-Infinity`; `JSON.stringify` turns it into `null`, corrupting saved snapshots.
9. Different genomes are backtested over different windows (loop starts at `slowMa + 1`), so comparisons aren't fully fair.

## Tasks (in priority order)

### 0. Per-account paper wallet + per-account bot (HIGH PRIORITY — owner's explicit requirement)
Current state (verified): `src/lib/store.ts` starts `usdtBalance: 10000` in Zustand memory only. Nothing about the wallet is saved.
A page refresh resets every user to $10,000, and switching accounts without a reload can carry one account's balance into another.
The GA bot is also global, not tied to any account.

Requirements:
- **Every account starts with exactly $10,000 USDT paper money**, created once in Firestore when the account is first created
  (e.g. `users/{uid}/wallet/main`: usdtBalance, btcBalance, open position incl. entry price/size/leverage/direction, realized PnL,
  createdAt, updatedAt). Never re-created or reset by a login, reload, or new device.
- **Balances persist exactly.** Log out and back in, refresh, or use another device: balance, BTC holdings and open positions are exactly
  what they were, not more, not less. Load the wallet from Firestore on login before enabling any trade buttons (show a loading state).
- **Every trade (manual, leverage, and bot) updates Firestore atomically** using a Firestore transaction (read wallet → validate funds →
  write new balances + append trade). Never write a balance computed from stale local state. Append each trade to `users/{uid}/trades`
  (time, side, price, amount, fee, source: manual|leverage|bot, balance after) so history can be audited.
- **Accounts are fully isolated.** On logout: stop the bot, clear all wallet/position/GA state from memory, unsubscribe listeners.
  On login: load only that user's wallet and bot. Logging into account B must show B's money, never A's.
- **Each account has its own bot**: GA runs, population, quarantine and history live under `users/{uid}/gaRuns/...`
  (this replaces the top-level `gaRuns` path in task 3). The bot trades only that account's wallet.
- **Logged-out users (owner's decision: guest wallet)**: they get a temporary **guest wallet** starting at $10,000 and a guest bot,
  held in memory only and never saved to Firestore. Show a clear banner: "Guest mode: your trades won't be saved. Log in to keep your progress."
  A refresh or leaving the site resets the guest wallet to $10,000. When a guest logs in, discard the guest wallet and load the account's
  saved wallet; guest money must NEVER be merged into, or overwrite, any account. On logout, the user's data is cleared and a fresh
  $10,000 guest wallet starts.
- Optional "Reset paper account to $10,000" button with a confirmation dialog, which logs the reset in the trade history.
- **Firestore security rules**: a user can only read/write `users/{their uid}/**`. Draft the rules and ask the owner before deploying them.
- Keep live PnL display working, but the saved source of truth is Firestore.
- Test: create two accounts; trade on A until its balance changes; log out; log into B → exactly $10,000; log back into A → A's exact
  balance and open position; refresh → unchanged; open in a second browser → identical.

### 0b. Fix + update My Dashboard (`/dashboard`) and public profile (`/profile/[uid]`)
These pages read stats from `users/{uid}` (manualTrades, leverageTrades, botTrades, gaGenerations, winRate, totalPnl) and have visibility toggles.
Verified bugs (owner's live account shows +0.26 USDT P&L but 0.0% win rate, which is inconsistent):
- `trade-panel.tsx` computes winRate from `tradesRef` / `leverageWinsRef`, which only hold the CURRENT session's trades, then OVERWRITES the saved
  winRate with that partial value. Manual and leverage paths overwrite each other's winRate.
- Spot P&L always compares to the FIRST buy in the session (`find(t => t.side === "buy")`) and ignores fees.
- Bot P&L (~line 372) uses a meaningless formula `lastSignal.price * amt - 100`.
- "Bot Advancement" levels count generations only, not actual improvement.
Required:
- Derive ALL stats from the source of truth in task 0 (`users/{uid}/wallet/main` + `users/{uid}/trades`), updated inside the same transaction as each trade.
  Use proper position accounting (average entry price, fees included). A "win" = a closed trade/position with net PnL > 0 after fees.
  Win rate = wins / closed trades across ALL history, plus per-source breakdowns (manual / leverage / bot).
- Total P&L = current total equity (cash + BTC at live price + open position value) − $10,000, plus realized P&L shown separately.
- Add new stats (each with a visibility toggle, default as noted): Paper balance / equity (on), Bot win rate (on), Best fitness (on),
  Best result on unseen data vs buy-and-hold (on), Strategies created (on), Strategies quarantined (on), Repeat mistakes blocked (on).
- "Bot Advancement": base levels on real learning (e.g. generations AND improvement of the champion on unseen data), not generation count alone.
  Show the criteria honestly on the page.
- Public profile shows only toggled-on stats, reading the same per-account data. Owner-only data (email, balances if hidden) must never be exposed;
  respect the security rules from task 0 (public profile fields can live in a separate readable `publicProfiles/{uid}` doc).
- Existing accounts: migrate gracefully. Existing counters keep working; recompute winRate/totalPnl from trades where possible, otherwise start
  them fresh from the new wallet and label it. Do not show the old broken winRate as if it were correct.
- Keep the existing look and layout of both pages; add the new stat cards in the same style.

### 1. Engine fixes (`ga-engine.ts`)
- Give every individual a **globally unique id** (e.g. `g{generation}-{n}`), plus `parentIds: string[]`,
  `bornGeneration`, and `origin: "random" | "crossover" | "mutation" | "elite" | "immigrant"`.
- Use `rsiLow` in the rule (e.g. exit/avoid shorts when RSI < rsiLow, or require oversold for long entries) — any sensible use, documented in a comment.
- Backtest all genomes over the **same window** (start at the max possible slow MA period).
- Replace `-Infinity` fitness with a finite floor (e.g. `-1`) everywhere.
- **Train/test split:** evolve on the older ~70% of candles, report best genome's equity on the newest ~30% (never used for selection). Track both per generation.
- **Diversity:** each generation inject 2–3 random "immigrants"; optionally raise mutation when diversity (avg normalized genome distance) drops below a threshold. Track diversity per generation.
- **Refresh candles** periodically (e.g. every generation or every N minutes) so the bot keeps learning on new data. Consider 1000 candles and/or 5m interval.

### 2. Failure archive = "isolation" (the key demo feature)
- When an individual is eliminated, record it in a **graveyard** with: id, genome, fitness, test equity, generation died, reason
  (e.g. "lost money", "drawdown too high", "outcompeted").
- Strategies that clearly failed (net loss or drawdown above a threshold) also go into a **quarantine/tabu list**.
- When creating a child, compute normalized distance to every quarantined genome. If too close (threshold tuned so it triggers sometimes but not constantly),
  **reject it and re-generate** (cap retries, then fall back to a random immigrant).
- Count and log every block: e.g. `Gen 14: blocked child (too similar to failed g9-17)`. Show a counter "Repeat mistakes blocked: N".

### 3. Persistence in Firestore
- Collection `users/{uid}/gaRuns/{runId}` (per account, see task 0; run metadata: started, status, config, totals).
- Subcollection `users/{uid}/gaRuns/{runId}/generations/{gen}`: generation number, timestamp, full population (24 individuals incl. parents/origin),
  best/avg/worst fitness, best test equity, diversity, eliminated list, blocked count. One doc per generation (well under 1 MB).
- `users/{uid}/gaRuns/{runId}/quarantine` (or an array on the run doc if small).
- On load, restore the latest run from Firestore (fallback to localStorage if offline/not logged in). Keep writes to ~1 per generation (free tier = 20k writes/day).
- Update Firestore security rules so users can only read/write their own runs (or make one public "demo run" readable by everyone for the presentation).

### 4. Dashboard visuals (`ga-dashboard/page.tsx`, live, real data only)
- **Learning curve** (Recharts): best, average fitness per generation + best test-set equity + a buy-and-hold baseline line. This is the "it got smarter" proof.
- **Evolution tree / lineage graph**: nodes = individuals by generation (columns), edges = parent→child. Elites glow, eliminated turn red and fade, newborns animate in. Show the last ~10–15 generations to stay readable. Custom SVG is fine.
- **Graveyard / quarantine panel**: list of isolated strategies with genome + reason, and the "repeat mistakes blocked" counter.
- **Genome evolution chart**: how each gene of the best strategy changed across generations.
- **Diversity meter** per generation.
- Click a node → show its genome, parents, fitness, test equity, fate.
- Keep the existing dark/emerald/purple style.

### 5. Demo mode
- A toggle for the presentation: generation interval ~3–5s instead of 45s, so judges watch many generations live. Clearly labeled.
- A "Reset run" button that starts a fresh run (old runs stay in Firestore) so the demo can start from generation 0 on stage.

### 5b. Judge Demo page — `/ga-demo` (the centerpiece of the presentation)
A dedicated full-screen page, readable on a projector from the back of a room (big text, high contrast),
that shows the bot's training as a live story. Everything is driven by the real engine; nothing scripted or faked.
- **Live narration feed**: every engine event as a plain-English line, paced so humans can follow (queue events, ~1 per second), e.g.
  "Generation 7 started: 24 strategies competing", "Strategy g7-3 lost 2.1% → eliminated and isolated in quarantine",
  "Child g8-12 blocked: 94% similar to failed strategy g5-9 → bot refuses to repeat that mistake",
  "New champion g8-2: +1.4% on training data, +0.6% on data it has never seen".
- **Center stage**: the evolution tree from task 4, big, with newborns appearing, parents linked, failures turning red and sliding into the quarantine zone.
- **Side panels**: generation counter, current champion's genome, "Repeat mistakes blocked" counter, quarantine count, diversity meter.
- **"Did it get smarter?" panel**: learning curve (best/avg fitness per generation + unseen-data equity + buy-and-hold baseline),
  and a **Gen 1 vs now** card: the best strategy from generation 1 and the current champion, both scored on the SAME unseen data, side by side.
  If the current one is not better, show that honestly.
- **Controls**: Start / Pause, speed (normal 45s, demo 3–5s), Reset (fresh run from gen 0), and **Replay** a saved run from Firestore at adjustable speed,
  so a long pre-trained run can be shown in 1–2 minutes if live Binance data or internet fails at the venue.
- **Step mode**: a "Next generation" button that runs exactly one generation and pauses, so the presenter can explain selection → crossover → mutation → blocking step by step.
- **End-of-run report card**: generations run, strategies created, eliminated, quarantined, repeats blocked, best training fitness, best unseen-data result vs buy-and-hold.
- Link it from the nav and from `/ga-dashboard`.

### 6. Honesty notes (keep these true in UI text and README)
- The GA runs in the browser while a tab is open; history is saved and resumes on reload, but it does not evolve while all tabs are closed (no backend).
- Results are backtests/paper signals, not guaranteed profits.

## Verification before finishing
- `npm run build` passes.
- Offline test script: run the engine 50+ generations on fixed historical data; confirm train fitness rises, test equity is reported,
  blocked-repeat counter > 0, no `NaN`/`null` fitness, lineage ids unique, every child's parentIds exist in the previous generation.
- `npm run dev`, open `/ga-dashboard`, run demo mode for a few minutes with real Binance data, reload the page and confirm history persists.
- Check Firestore console that generation docs appear.

## Do NOT change (owner's explicit requirement)
- The trading page, TradingView charts (`MiniTradingViewWidget.tsx`, `trading-chart.tsx`, `tv.js` script in `layout.tsx`),
  order book, recent trades, sparklines, and the live data feed in `src/lib/DataProvider.tsx`
  (Binance public WebSocket + klines endpoints). They must look and behave exactly as they do now.
- If a GA change needs data, read it from the existing store or call the same public Binance endpoints; don't refactor the chart data flow.

## Workflow
Make focused commits per task. Don't remove existing pages/features. Ask before changing Firebase rules or anything that affects other users' data.
