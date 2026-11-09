import { seasonRaw } from '../api/history';
// Replays a past season from the offline history with different rules: another points system, a driver taken out, the worst results dropped.
export const SYSTEMS = [
  ['actual', 'As it happened', null],
  ['modern', 'Modern 25-18-15 (no fastest lap)', [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]],
  ['modernfl', 'Modern + fastest lap point', [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], true],
  ['y2003', '2003: 10-8-6-5-4-3-2-1', [10, 8, 6, 5, 4, 3, 2, 1]],
  ['y1991', '1991: 10-6-4-3-2-1', [10, 6, 4, 3, 2, 1]],
  ['y1960', '1960: 8-6-4-3-2-1', [8, 6, 4, 3, 2, 1]],
  ['win', 'Win bonus: 30-18-15-12-10-8-6-4-2-1', [30, 18, 15, 12, 10, 8, 6, 4, 2, 1]],
  ['podium', 'Podium only: 5-3-1', [5, 3, 1]],
];
const rankOf = (rows, key) => { const o = [...rows].sort((a, b) => b.total - a.total || b.wins - a.wins || a.name.localeCompare(b.name)); const m = {}; o.forEach((r, i) => { m[r[key]] = i + 1; }); return { o, m }; };
export function replay(year, { system = 'actual', remove = null, drop = 0 } = {}) {
  const races = seasonRaw(year); if (!races) return null; const sys = SYSTEMS.find((x) => x[0] === system) || SYSTEMS[0];
  const calc = (opts) => {
    const per = {}, teams = {};
    races.forEach((rc) => {
      let rows = rc.rows; if (opts.remove) { const cl = rows.filter((r) => r.id !== opts.remove && r.pos != null).sort((a, b) => a.pos - b.pos).map((r, i) => ({ ...r, pos: i + 1 })); rows = [...cl, ...rows.filter((r) => r.id !== opts.remove && r.pos == null)]; }
      rows.forEach((r) => {
        const table = opts.sys[2]; let p;
        if (!table) p = r.pts; else p = r.pos != null && r.pos <= table.length ? table[r.pos - 1] + (opts.sys[3] && r.fast && r.pos <= 10 ? 1 : 0) : (opts.sys[3] && r.fast && r.pos != null && r.pos <= 10 ? 1 : 0);
        const d = (per[r.id] = per[r.id] || { id: r.id, name: r.name, team: r.team, list: [], wins: 0 }); d.team = r.team; d.list.push(p); if (r.pos === 1) d.wins++;
        teams[r.team] = (teams[r.team] || 0) + p;
      });
    });
    const drivers = Object.values(per).map((d) => { const s = [...d.list].sort((a, b) => b - a); const kept = opts.drop ? s.slice(0, Math.max(0, s.length - opts.drop)) : s; return { ...d, total: Math.round(kept.reduce((a, b) => a + b, 0) * 10) / 10 }; });
    return { drivers, teams: Object.entries(teams).map(([name, total]) => ({ name, total: Math.round(total * 10) / 10, wins: 0 })) };
  };
  const base = calc({ sys: SYSTEMS[0], remove: null, drop: 0 }); const alt = calc({ sys, remove, drop });
  const bd = rankOf(base.drivers, 'id'), ad = rankOf(alt.drivers, 'id'); const bt = rankOf(base.teams, 'name'), at = rankOf(alt.teams, 'name');
  return {
    races: races.length,
    drivers: ad.o.map((r, i) => ({ ...r, pos: i + 1, was: bd.m[r.id] || null, wasTotal: base.drivers.find((x) => x.id === r.id)?.total ?? 0 })),
    teams: at.o.map((r, i) => ({ ...r, pos: i + 1, was: bt.m[r.name] || null, wasTotal: base.teams.find((x) => x.name === r.name)?.total ?? 0 })),
    champion: { was: bd.o[0], now: ad.o[0] }, constructor: { was: bt.o[0], now: at.o[0] },
    roster: base.drivers.map((d) => ({ id: d.id, name: d.name })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
