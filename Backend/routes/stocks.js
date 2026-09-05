const express = require('express');
const { readDB, writeDB } = require('../db');
const { authRequired } = require('../middleware/auth');
const { getCompanyNews } = require('../services/finnhub');
const { computeChange } = require('../services/changeEngine');

const router = express.Router();
router.use(authRequired);

const STALE_AFTER_MS = 5 * 60 * 1000;

router.get('/changes', async (req, res) => {
  const db = readDB();
  const items = db.watchlists.filter((w) => w.userId === req.userId);

  const results = await Promise.all(
    items.map(async (item) => {
      const snapshot = db.snapshots[item.symbol];
      const lastSeenEntry = db.lastSeen.find((l) => l.userId === req.userId && l.symbol === item.symbol);

      if (!snapshot) {
        return { symbol: item.symbol, bucket: 'loading', score: 0, summary: 'Fetching data for the first time…' };
      }

      let news = [];
      try {
        if (lastSeenEntry) {
          const roughChange = Math.abs(((snapshot.price - lastSeenEntry.price) / lastSeenEntry.price) * 100);
          if (roughChange > 2) news = await getCompanyNews(item.symbol);
        }
      } catch (e) {
        /* best-effort */
      }

      const change = computeChange({
        current: { price: snapshot.price },
        lastSeen: lastSeenEntry,
        priceHistory: snapshot.priceHistory,
        news,
      });

      return {
        symbol: item.symbol,
        price: snapshot.price,
        prevClose: snapshot.prevClose,
        high: snapshot.high,
        low: snapshot.low,
        stale: Date.now() - snapshot.fetchedAt > STALE_AFTER_MS,
        fetchedAt: snapshot.fetchedAt,
        ...change,
        newsHeadlines: news.slice(0, 2).map((n) => n.headline),
      };
    })
  );

  const order = { attention: 0, drifted: 1, new: 2, quiet: 3, loading: 4 };
  results.sort((a, b) => order[a.bucket] - order[b.bucket] || b.score - a.score);

  res.json(results);
});

router.post('/:symbol/visit', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const db = readDB();
  const snapshot = db.snapshots[symbol];
  if (!snapshot) return res.status(404).json({ error: 'No data yet for this symbol' });

  db.lastSeen = db.lastSeen.filter((l) => !(l.userId === req.userId && l.symbol === symbol));
  db.lastSeen.push({ userId: req.userId, symbol, price: snapshot.price, seenAt: Date.now() });
  writeDB(db);
  res.json({ ok: true });
});

router.post('/visit-all', (req, res) => {
  const db = readDB();
  const symbols = [...new Set(db.watchlists.filter((w) => w.userId === req.userId).map((w) => w.symbol))];

  symbols.forEach((symbol) => {
    const snapshot = db.snapshots[symbol];
    if (!snapshot) return;
    db.lastSeen = db.lastSeen.filter((l) => !(l.userId === req.userId && l.symbol === symbol));
    db.lastSeen.push({ userId: req.userId, symbol, price: snapshot.price, seenAt: Date.now() });
  });

  writeDB(db);
  res.json({ ok: true });
});

module.exports = router;