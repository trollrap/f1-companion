// Tyre usage of one race, worked out from every driver's stints: laps and stints per compound, the longest stint of each, and each team's mix.
const ORDER = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET', 'UNKNOWN'];
export function tyreUsage(d) {
  const rows = (d && d.rows) || []; if (!rows.length) return null;
  const comps = {}, teams = {}, stops = {};
  rows.forEach((r) => {
    const n = Math.max(0, r.stints.length - 1); stops[n] = (stops[n] || 0) + 1;
    const t = (teams[r.team || 'Unknown'] ||= { team: r.team || 'Unknown', color: r.color, cars: 0, stops: 0, laps: {}, total: 0 }); t.cars++; t.stops += n;
    r.stints.forEach((s) => {
      const len = Math.max(0, (s.to || 0) - (s.from || 1) + 1); if (!len) return;
      const c = (comps[s.compound] ||= { compound: s.compound, stints: 0, laps: 0, longest: { len: 0, last: '' } }); c.stints++; c.laps += len; if (len > c.longest.len) c.longest = { len, last: r.last };
      t.laps[s.compound] = (t.laps[s.compound] || 0) + len; t.total += len;
    });
  });
  const total = Object.values(comps).reduce((a, c) => a + c.laps, 0); if (!total) return null;
  const list = ORDER.filter((k) => comps[k]).map((k) => ({ ...comps[k], share: comps[k].laps / total, avg: comps[k].laps / comps[k].stints }));
  const tl = Object.values(teams).filter((t) => t.total).sort((a, b) => a.team.localeCompare(b.team)).map((t) => ({ ...t, avgStops: t.stops / t.cars }));
  const cars = rows.length; const common = Object.entries(stops).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return { comps: list, teams: tl, cars, commonStops: Number(common[0]), commonCount: common[1] };
}
