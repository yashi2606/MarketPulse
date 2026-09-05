const FINNHUB_BASE = 'https://finnhub.io/api/v1';

function apiKey() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error('FINNHUB_API_KEY is not set in .env');
  return key;
}

async function getQuote(symbol) {
  const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub quote request failed for ${symbol} (${res.status})`);
  const data = await res.json();
  if (data.c === 0 && data.pc === 0) throw new Error(`Unknown or unsupported symbol: ${symbol}`);
  return data;
}

async function getCompanyNews(symbol) {
  const to = new Date();
  const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().split('T')[0];
  const url = `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${fmt(from)}&to=${fmt(to)}&token=${apiKey()}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

module.exports = { getQuote, getCompanyNews };