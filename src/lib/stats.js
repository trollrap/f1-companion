// Season figures computed from Grand Prix results. Sprint points count in the standings but sprints are not listed as races here.
export const classified = (r) => !Number.isNaN(Number(r.positionText));
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
export function seasonStats(rows, poles, q3) {
  const fin = rows.filter(classified);
  return {
    races: rows.length, wins: rows.filter((r) => r.position === 1).length, podiums: rows.filter((r) => r.position <= 3 && classified(r)).length,
    poles, q3, fastest: rows.filter((r) => r.fastest).length, pointsFinishes: rows.filter((r) => r.points > 0).length,
    notClassified: rows.length - fin.length, avgGrid: avg(rows.filter((r) => r.grid > 0).map((r) => r.grid)), avgFinish: avg(fin.map((r) => r.position)),
  };
}
// Rounds where both drivers were classified or exactly one was: counts who finished ahead.
export function headToHead(a, b) {
  let ahead = 0, behind = 0;
  a.forEach((x) => { const y = b.find((z) => z.round === x.round); if (!y) return;
    const ca = classified(x), cb = classified(y);
    if (ca && cb) { if (x.position < y.position) ahead++; else behind++; } else if (ca) ahead++; else if (cb) behind++; });
  return [ahead, behind];
}
export const fix = (n, d = 1) => (n == null ? '—' : n.toFixed(d));
