import { POINTS } from './sim';
// Stats of your own driver, worked out from the seasons and races you entered (plus the fantasy seasons you drove in).
export function profileStats(p, fantasies = []) {
  const rows = []; (p?.seasons || []).forEach((s) => (s.races || []).forEach((r) => rows.push({ year: Number(s.year), grid: Number(r.grid) || null, pos: /^\d+$/.test(String(r.pos)) ? Number(r.pos) : null })));
  const fantasyRows = [];
  fantasies.forEach((f) => { const me = f.drivers.find((d) => d.me); if (!me) return; f.races.forEach((r) => { const x = f.results?.[r.id]?.Race?.find((y) => y.driverId === me.id); if (x) fantasyRows.push({ pos: x.status === 'OK' ? x.pos : null, grid: x.grid, pts: x.points }); }); });
  const all = [...rows, ...fantasyRows];
  const years = new Set(rows.map((r) => r.year)); const own = rows.length;
  return {
    seasons: (p?.seasons || []).length, races: all.length, wins: all.filter((r) => r.pos === 1).length, podiums: all.filter((r) => r.pos && r.pos <= 3).length,
    poles: all.filter((r) => r.grid === 1).length, dnf: all.filter((r) => !r.pos).length, best: all.some((r) => r.pos) ? Math.min(...all.filter((r) => r.pos).map((r) => r.pos)) : null,
    points: rows.reduce((a, r) => a + (r.pos ? POINTS[r.pos - 1] || 0 : 0), 0) + fantasyRows.reduce((a, r) => a + (r.pts || 0), 0),
    first: years.size ? Math.min(...years) : null, own,
  };
}
