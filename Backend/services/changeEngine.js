function computeChange({ current, lastSeen, priceHistory, news }) {
  if (!lastSeen) {
    return {
      bucket: 'new',
      score: 0,
      summary: "You haven't checked this one before — here's where it stands.",
    };
  }

  const priceChangePct = ((current.price - lastSeen.price) / lastSeen.price) * 100;

  let volatilityPct = 1;
  if (priceHistory && priceHistory.length > 2) {
    const pctChanges = [];
    for (let i = 1; i < priceHistory.length; i++) {
      const prev = priceHistory[i - 1];
      if (prev) pctChanges.push(((priceHistory[i] - prev) / prev) * 100);
    }
    if (pctChanges.length > 0) {
      const mean = pctChanges.reduce((a, b) => a + b, 0) / pctChanges.length;
      const variance = pctChanges.reduce((a, b) => a + (b - mean) ** 2, 0) / pctChanges.length;
      volatilityPct = Math.max(Math.sqrt(variance), 0.3);
    }
  }

  const sigma = Math.abs(priceChangePct) / volatilityPct;

  const moveScore = Math.min(sigma * 20, 60);
  const newsScore = news && news.length > 0 ? 30 : 0;
  const magnitudeScore = Math.min(Math.abs(priceChangePct) * 2, 10);

  const score = Math.round(Math.min(moveScore + newsScore + magnitudeScore, 100));

  let bucket = 'quiet';
  if (score >= 55) bucket = 'attention';
  else if (score >= 20) bucket = 'drifted';

  const direction = priceChangePct >= 0 ? 'up' : 'down';
  const parts = [`${direction === 'up' ? '↑' : '↓'} ${Math.abs(priceChangePct).toFixed(1)}% since your last visit`];
  if (sigma > 1.5) parts.push(`unusual move for this stock (${sigma.toFixed(1)}σ)`);
  if (news && news.length > 0) parts.push(`${news.length} recent news item${news.length > 1 ? 's' : ''}`);

  return {
    bucket,
    score,
    priceChangePct: Number(priceChangePct.toFixed(2)),
    sigma: Number(sigma.toFixed(2)),
    summary: parts.join(' • '),
  };
}

module.exports = { computeChange };