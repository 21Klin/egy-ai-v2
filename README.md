# EGY-AI

**Low-Latency Genetic Algorithm Adaptive Trading Framework**

A live, browser-based algorithmic trading system that evolves its own BTC/USDT trading strategies in real time using a genetic algorithm, built by a 17-year-old student.

🔗 **Live demo:** https://egy-ai.pages.dev
📄 **Full research paper:** see `EGY-AI_Research_Paper_2026.pdf` in this repo
👤 **Author:** Eren Murtishi — Yahya Kemal College, Struga, North Macedonia
🏆 **Competition:** Young Hackers 4 Freedom (YH4F) 2026

---

## Table of Contents

- [What is EGY-AI?](#what-is-egy-ai)
- [Research Question](#research-question)
- [Features](#features)
- [Architecture](#architecture)
- [Code Structure](#code-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [How the Genetic Algorithm Works](#how-the-genetic-algorithm-works)
- [Tech Stack](#tech-stack)
- [Testing](#testing)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [FAQ](#faq)
- [Contact](#contact)
- [License](#license)

---

## What is EGY-AI?

EGY-AI is a complete algorithmic trading platform where the trading strategy itself **evolves** rather than being hand-coded. Instead of fixed if/else rules, a population of 24 candidate strategies (genomes) is continuously evaluated against live Binance market data, and the fittest strategies survive and reproduce through genetic crossover and mutation — every 45 seconds, forever, in your browser.

No backend server is required for the core engine. Everything — the WebSocket data feed, the genetic algorithm, the trade simulation — runs client-side.

## Research Question

> Can a low-latency algorithmic trading system improve trade execution speed and decision-making in volatile cryptocurrency markets?

This question, and the full methodology used to answer it, is explored in depth in the accompanying research paper.

## Features

- 🔴 **Live market data** — real BTC/USDT price, order book depth, and recent trades streamed via Binance WebSocket
- 🧬 **Real genetic algorithm** — 24-individual population, tournament selection, arithmetic crossover, adaptive mutation, elitism
- 📊 **GA Dashboard** — watch evolution happen generation by generation, with live fitness scores and evolved genome parameters
- 💹 **Paper trading terminal** — Spot and Leverage (1x–8x) trading against a simulated 10,000 USDT balance
- 🛑 **Risk management** — automatic 8% stop-loss circuit breaker
- 📚 **Six-chapter Learn section** — teaches genetic algorithms, crypto trading, order books, RSI, and the system's own architecture
- 👤 **User profiles** — Firebase authentication with public/private dashboards and trading statistics
- 📈 **Equity curve tracking** — visualise simulated portfolio performance over time

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Binance Public  │────▶│   DataProvider    │────▶│  Zustand Store  │
│  WebSocket API   │     │  (4 live streams) │     │  (global state)  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                            │
                         ┌──────────────────────────────────┼──────────────────┐
                         ▼                                  ▼                  ▼
                 ┌───────────────┐               ┌──────────────────┐  ┌──────────────┐
                 │  GA Engine     │               │  Trade Panel      │  │  GA Dashboard │
                 │  (singleton)   │◀─────────────▶│  (Spot/Lev/Bot)   │  │  (live view)  │
                 └───────────────┘               └──────────────────┘  └──────────────┘
```

The GA engine is implemented as a **singleton Zustand store** rather than a React hook — an important fix made during development, since a hook-based version would let every component spawn its own independent population, causing the Trading page and GA Dashboard to silently disagree with each other.

## Code Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── trading/               # Live trading terminal
│   ├── ga-dashboard/          # GA evolution viewer
│   ├── history/                # Bot trade history + equity curve
│   ├── learn/                  # Six-chapter educational section
│   ├── dashboard/              # Private user dashboard
│   ├── profile/[uid]/          # Public user profile
│   ├── login/ signup/          # Firebase auth pages
│   └── ...
├── components/
│   ├── trade-panel.tsx         # Spot / Leverage / GA Bot tabs
│   ├── order-book.tsx          # Live order book
│   ├── recent-trades.tsx       # Live trade feed
│   ├── sparkline-chart.tsx     # Live price chart
│   └── ui/                     # Reusable UI primitives
└── lib/
    ├── ga-engine.ts            # Pure GA functions: fitness, crossover, mutation
    ├── ga-store.ts             # Singleton GA state (Zustand)
    ├── store.ts                # Trading state (balances, positions)
    ├── DataProvider.tsx         # Binance WebSocket connections
    ├── firebase.ts firestore.ts # Auth + database
    └── profile-store.ts         # User stats tracking
```

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org) 18 or later.

```bash
# 1. Clone the repository
git clone https://github.com/21Klin/egy-ai-v2.git
cd egy-ai-v2

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
cp .env.example .env.local
# then fill in your Firebase config

# 4. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file in the project root with your own [Firebase](https://console.firebase.google.com) project config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

You'll also need to enable **Authentication** (Google + Email/Password) and **Cloud Firestore** in your Firebase console.

## How the Genetic Algorithm Works

Each strategy is represented as a genome of five parameters:

| Parameter | Range | Meaning |
|---|---|---|
| `fastMa` | 3–24 | Short moving-average window |
| `slowMa` | fastMa+5 to 80 | Long moving-average window |
| `rsiPeriod` | 5–30 | RSI lookback period |
| `rsiLow` | 10–45 | Reserved RSI lower threshold |
| `rsiHigh` | 55–90 | RSI overbought ceiling for entries |

Every 45 seconds, the engine:
1. Backtests all 24 genomes against the 500 most recent real Binance candles
2. Scores each with a fitness function that **penalises drawdown twice as heavily as it rewards return**, and deducts realistic 0.10% trading fees per trade
3. Keeps the top 4 unchanged (elitism)
4. Fills the remaining 20 slots via tournament selection + crossover + mutation
5. Extracts a live BUY/SELL/HOLD signal from the best-performing genome

Full mathematical detail — including the exact fitness formula, crossover equation, and mutation bounds — is in the research paper.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| State management | Zustand |
| Styling | Tailwind CSS |
| Charts | Recharts, TradingView widgets |
| Auth & Database | Firebase Authentication, Cloud Firestore |
| Market data | Binance public WebSocket + REST API |
| Deployment | Cloudflare Pages |

## Testing

The system was tested across more than 1,000 simulated trades spanning trending, consolidating, and high-volatility market conditions, using live BTC/USDT data. Full methodology, metrics, and results are documented in the research paper, including:

- Average generations to convergence: 8–12
- Evolved fast MA clustering: 7–14 candles
- Evolved slow MA clustering: 28–45 candles
- Stop-loss activations during adverse sessions: 2 of 12

## Known Limitations

- No real capital is used anywhere — this is a paper-trading simulator
- Population size (24) and generation interval (45s) are tuned for browser performance, not maximum optimisation
- No walk-forward validation yet (planned — see Roadmap)
- Single-asset (BTC/USDT) only at this stage

## Roadmap

- [ ] Multi-asset genome (BTC, ETH, BNB)
- [ ] Walk-forward out-of-sample validation
- [ ] Server-side GA backend for larger populations
- [ ] Reinforcement learning hybrid layer
- [ ] Fear & Greed Index integration as an additional gene
- [ ] Shareable/exportable genomes ("genome marketplace")

## Contributing

This is a student research project, but feedback and issue reports are welcome. To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Open a Pull Request describing what you changed and why

Please keep PRs focused — one feature or fix per PR makes review much easier.

## FAQ

**Is this using real money?**
No. All trades are simulated against a virtual 10,000 USDT balance. Market data is real and live; capital is not.

**Can I run my own GA population?**
Yes — every visitor gets their own independent GA session via `localStorage`. Nothing is shared between users unless you create an account and choose to make stats public.

**Why no backend server?**
A deliberate design choice — it makes the system instantly accessible to anyone with a browser, with no infrastructure cost, and demonstrates that meaningful evolutionary computation is achievable client-side.

**Does the GA actually learn, or is it random?**
It's a real genetic algorithm — every fitness score is computed by backtesting against real historical Binance candles. Nothing is faked or randomly generated for display purposes.

## Contact

Eren Murtishi
📧 egy.ai.dev@gmail.com
🌐 https://egy-ai.pages.dev

## License

MIT License — see [`LICENSE`](./LICENSE) for details. Free to use, study, modify, and share with attribution.
