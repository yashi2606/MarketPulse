# MarketPulse — Smart Market Watchlist

Built for Code, by Groww (2026)

A watchlist that doesn't just show prices — it tells you what actually
changed since you last checked, and how urgently it deserves your attention.

## Features

- Create and manage a personal stock watchlist
- Live price data from Finnhub
- Stocks are automatically sorted into three buckets based on how
  meaningful the change is:
  - 🔴 **Needs Attention** — big or unusual moves
  - 🟡 **Drifted** — noticeable but not urgent
  - ⚪ **Quiet** — nothing significant
- Each user has their own independent "last seen" baseline per stock
- Background polling keeps prices fresh without hammering the API

## Why this version, not the obvious watchlist

A normal watchlist answers "what's the price right now." The real question
after being away is "what happened while I wasn't looking, and does it
matter?"

- **Meaningful change is relative to the stock**, not a flat threshold.
  Instead of "alert if price moves >5%", each stock's move is scored
  against its own recent volatility — a 2% move on a calm stock matters
  more than 2% on one that's usually volatile.
- **Three buckets, not one flat list**, so the user knows in five seconds
  what deserves attention instead of scanning every row.
- **Personal baseline per user** — two users watching the same stock see
  different diffs, based on when each of them last checked. This baseline
  lives server-side, so it also persists across devices/sessions.

## Handling stale, delayed, or conflicting data

- A single shared background poller refreshes each unique symbol once per
  cycle, instead of every user triggering their own API call — this is
  also the scaling answer: 1,000 users watching AAPL costs one API call
  per cycle, not 1,000.
- If a price fetch fails, the last good price is kept and marked
  "Delayed" in the UI, instead of showing an error or wrong data.
- News is only fetched for stocks with a real price move, to conserve
  free-tier API quota.

## Known limitation

The "Add stock" input currently only understands ticker symbols (e.g.
`AAPL`, `TSLA`), not full company names — a real gap for anyone who
doesn't already know the shortcut.

## Tech stack

- **Backend:** Node.js, Express, JWT auth, JSON-file storage
- **Frontend:** React, Tailwind CSS, shadcn/ui
- **Market data:** Finnhub (free tier)

## Getting started

### Prerequisites
- Node.js v18 or higher
- A free Finnhub API key — [get one here](https://finnhub.io) (takes under a minute)

### 1. Clone the repository
```bash
git clone https://github.com/yashi2606/MarketPulse.git
cd MarketPulse
```

### 2. Set up the backend
```bash
cd Backend
cp .env.example .env
```
Open `.env` and paste your Finnhub API key:
