const express = require('express');
const { readDB, writeDB } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const db = readDB();
  const items = db.watchlists.filter((w) => w.userId === req.userId);
  res.json(items);
});

router.post('/', (req, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });

  const sym = symbol.toUpperCase().trim();
  const db = readDB();

  const exists = db.watchlists.find((w) => w.userId === req.userId && w.symbol === sym);
  if (exists) return res.status(409).json({ error: 'Already in your watchlist' });

  db.watchlists.push({ id: Date.now().toString(), userId: req.userId, symbol: sym, addedAt: Date.now() });

  writeDB(db);
  res.status(201).json({ ok: true });
});

router.delete('/:symbol', (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const db = readDB();
  db.watchlists = db.watchlists.filter((w) => !(w.userId === req.userId && w.symbol === sym));
  db.lastSeen = db.lastSeen.filter((l) => !(l.userId === req.userId && l.symbol === sym));
  writeDB(db);
  res.json({ ok: true });
});

module.exports = router;