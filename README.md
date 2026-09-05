# MarketPulse — Smart Market Watchlist
Built for Code, by Groww (2026)

A watchlist that doesn't just show prices — it tells you what actually
changed since you last checked, and how urgently it deserves your attention.

## Why this version, not the obvious watchlist

A normal watchlist answers "what's the price right now." The real question
after being away is "what happened while I wasn't looking, and does it
matter?" Three decisions follow from that:

### 1. Meaningful change is relative to the stock, not a flat threshold
Instead of "alert if price moves >5%", we track each symbol's own recent
volatility and score a move in "sigma units" — how unusual this move is
FOR THIS PARTICULAR STOCK. A 2% move on a sleepy blue-chip is far more
significant than the same move on a volatile stock.

### 2. Three buckets, not one flat list
Stocks sort into 🔴 Needs Attention / 🟡 Drifted / ⚪ Quiet, so the user
knows in five seconds what deserves attention, instead of scanning every row.

### 3. Personal "last seen" baseline, per user
Every user has their own baseline per symbol — two users watching the
same stock see different diffs based on when THEY last checked, not a
shared timestamp. This is also how state persists across sessions/devices:
baselines live server-side, keyed by user + symbol.

## Handling stale, delayed, or conflicting data
- A single shared background poller refreshes each unique symbol once per
  cycle — user requests never call Finnhub directly, they read a cache.
  This is also the scaling answer: 1,000 users watching AAPL costs one
  API call per cycle, not 1,000.
- If a poll fails (rate limit, network issue), the last good snapshot is
  kept and a `stale` flag is surfaced to the UI, instead of erroring out
  or showing silently wrong data.
- News is only fetched for symbols that already show a real price move,
  to conserve free-tier API quota.

## Edge cases handled
- Unknown/invalid symbols are rejected with a clear error instead of
  crashing the poller for other symbols.
- Duplicate watchlist entries per user are blocked at the API level.
- A newly-added symbol always starts in "New" — no user inherits another
  user's baseline, so each user's "what changed since I looked" is fully
  independent even for the same stock.
- If FINNHUB_API_KEY is missing, the server still boots and logs a clear
  warning instead of crashing silently.

## Known limitation
The "Add stock" input currently only understands ticker symbols (e.g.
`AAPL`, `TSLA`), not company names — a real usability gap for anyone who
doesn't already know the shortcut.

## Where we kept it simple on purpose
- JSON-file storage instead of MongoDB/Postgres — zero setup for anyone
  running the submission, same data shape you'd hand to a real DB later.
- No frontend build-heavy framework choices beyond what's needed —
  polling instead of WebSockets, since free-tier market data doesn't
  need sub-second updates anyway.

## Tech stack
- Backend: Node.js, Express, JWT auth, JSON file store
- Frontend: React (TanStack Start), Tailwind, shadcn/ui
- Market data: Finnhub (free tier)

## Running it locally

1. Get a free Finnhub API key: https://finnhub.io

2. Backend:
```bash
   cd Backend
   cp .env.example .env    # paste your FINNHUB_API_KEY here
   npm install
   npm start
```

3. Frontend (separate terminal):
```bash
   npm install
   npm run dev
```

4. Sign up, add a stock (e.g. `AAPL`, `TSLA`, `NVDA`), and wait ~60
   seconds for the first poll cycle to bring in live data.