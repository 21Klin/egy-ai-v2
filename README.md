# EGY-AI Patch — Drop-in improvements

These files go INTO your existing `egy-ai-full` project folder.
Do NOT run `npm install` again — just replace/add these files and
`npm run dev` will pick them up automatically.

## What this fixes

1. Guide page 404 → new page at /guide
2. 404 error page → custom styled not-found page  
3. Trading page header → fixed from "Low-Latency Trading Agent" to "EGY-AI Trading Terminal"
4. Mobile nav → hamburger menu, all pages reachable on mobile
5. GA Dashboard → proper loading state while Binance data fetches
6. Stop-loss circuit breaker → bot auto-pauses if session losses exceed 8%

## Exact files to replace — copy from this zip into your project

```
PATCH FILE                              → YOUR PROJECT PATH
─────────────────────────────────────────────────────────────
src/app/guide/page.tsx                  → src/app/guide/page.tsx        (NEW folder)
src/app/not-found.tsx                   → src/app/not-found.tsx         (NEW file)
src/app/trading/page.tsx                → src/app/trading/page.tsx      (REPLACE)
src/app/ga-dashboard/page.tsx           → src/app/ga-dashboard/page.tsx (REPLACE)
src/app/layout.tsx                      → src/app/layout.tsx            (REPLACE)
src/components/trade-panel.tsx          → src/components/trade-panel.tsx (REPLACE)
```

## How to apply

1. Open your `egy-ai-full` project folder in VS Code
2. For each file above: find the matching path in your project,
   delete the old file, paste in the new one from this zip
3. For `src/app/guide/` — create that folder first, then add page.tsx
4. For `src/app/not-found.tsx` — just add it, no folder needed
5. Run `npm run dev` as normal — no reinstall needed

## That's it. Everything else stays the same.
