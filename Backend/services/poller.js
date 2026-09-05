const { readDB, writeDB } = require('../db');
const { getQuote } = require('./finnhub');

const POLL_INTERVAL_MS = 60 * 1000;
const HISTORY_LENGTH = 20;

async function pollOnce() {
  const db = readDB();
  const symbols = [...new Set(db.watchlists.map((w) => w.symbol))];

  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      const prev = db.snapshots[symbol];
      const priceHistory = (prev?.priceHistory || []).slice(-(HISTORY_LENGTH - 1));
      priceHistory.push(quote.c);

      db.snapshots[symbol] = {
        price: quote.c,
        prevClose: quote.pc,
        high: quote.h,
        low: quote.l,
        fetchedAt: Date.now(),
        priceHistory,
      };
    } catch (e) {
      console.error(`[poller] failed for ${symbol}: ${e.message}`);
    }
  }
  writeDB(db);
}

function startPoller() {
  pollOnce();
  setInterval(pollOnce, POLL_INTERVAL_MS);
}

module.exports = { startPoller, pollOnce };