import { driversMeta, dobOf, localCareer, localSeasonResults, teamNameOf, titlesOf } from '../api/history';
import { norm } from './names';

// Everything the Guess-the-driver game compares, for one driver.
export function profileOf(id) {
  const m = driversMeta().find((x) => x.id === id); if (!m) return null; const c = localCareer(id) || {}; let team = '';
  try { const r = localSeasonResults(m.lastYear, id) || []; team = r.length ? r[r.length - 1].team : ''; } catch {}
  const born = Number(String(dobOf(id) || '').slice(0, 4)) || null;
  return { id, name: m.name, nat: m.nat, team, first: m.first, last: m.lastYear, born, wins: Number(c.wins) || 0, titles: titlesOf(id), champ: m.champ };
}
export const secretPool = () => driversMeta().filter((d) => d.races >= 40 && d.lastYear >= 1995).map((d) => d.id);
export function searchDrivers(q, skip = []) { const n = norm(q); if (n.length < 2) return []; return driversMeta().filter((d) => !skip.includes(d.id) && norm(d.name).includes(n)).sort((a, b) => b.lastYear - a.lastYear).slice(0, 6); }
const cmp = (g, s) => (g === s ? 'eq' : s > g ? 'up' : 'down');
// Per field: 'eq' (correct), 'up' (secret is higher or later), 'down' (lower or earlier), 'no' (wrong, not ordered).
export function compare(g, s) {
  return { nat: g.nat === s.nat ? 'eq' : 'no', team: g.team === s.team ? 'eq' : 'no', first: cmp(g.first, s.first), born: g.born && s.born ? cmp(g.born, s.born) : 'no', wins: cmp(g.wins, s.wins), champ: g.champ === s.champ ? 'eq' : 'no' };
}
export { teamNameOf };
