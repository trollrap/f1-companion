import { driversMeta, historyYears, localDriverStandings, careerStats, careerTeams } from '../api/history';

const shuffle = (r, a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const famous = () => driversMeta().filter((d) => d.races >= 100);

// Name that season: the top five of a final table, pick the year from four.
export function makeSeasonQ(r) {
  const years = historyYears().filter((y) => y >= 1960); const y = years[Math.floor(r() * years.length)]; const st = localDriverStandings(y); if (!st || st.length < 5) return null;
  const near = shuffle(r, years.filter((x) => x !== y && Math.abs(x - y) <= 9)).slice(0, 3); if (near.length < 3) return null;
  const opts = shuffle(r, [y, ...near]).sort((a, b) => a - b);
  return { rows: st.slice(0, 5).map((s) => ({ name: s.name, pts: s.points, team: s.team })), races: st.round, options: opts.map(String), answer: opts.indexOf(y), year: y };
}
// Career path: the teams a driver raced for, in order. Pick the driver.
export function makeCareerQ(r) {
  const pool = shuffle(r, famous().filter((d) => d.teams.size >= 3)); for (const d of pool) {
    const c = careerTeams(d.id); if (!c || c.seq.length < 3) continue; const path = c.seq.join(' > ');
    const others = []; for (const o of shuffle(r, famous().filter((x) => x.id !== d.id && Math.abs(x.first - d.first) <= 12))) { const oc = careerTeams(o.id); if (oc && oc.seq.join(' > ') !== path) others.push(o); if (others.length === 3) break; }
    if (others.length < 3) continue; const opts = shuffle(r, [d, ...others]);
    return { path: c.seq, options: opts.map((x) => x.name), answer: opts.indexOf(d), name: d.name, years: `${d.first}-${d.lastYear}` };
  }
  return null;
}
// Match pairs: six drivers, each with the team they raced most for (all different teams).
export function makePairs(r) {
  const out = [], used = new Set();
  for (const d of shuffle(r, famous().filter((x) => x.lastYear >= 1985))) { const c = careerTeams(d.id); if (!c || !c.main || used.has(c.main) || c.mainStarts < 40) continue; used.add(c.main); out.push({ id: d.id, name: d.last, team: c.main }); if (out.length === 6) break; }
  if (out.length < 6) return null;
  const cards = shuffle(r, out.flatMap((p, k) => [{ k, side: 'd', text: p.name }, { k, side: 't', text: p.team }])).map((c, i) => ({ ...c, i }));
  return { cards, pairs: out };
}
const STATS = [['wins', 'race wins'], ['podiums', 'podiums'], ['poles', 'poles from P1'], ['starts', 'race starts']];
// Stat showdown: two drivers, one stat, who has more. No ties.
export function makeShowdown(r) {
  const pool = famous(); for (let n = 0; n < 40; n++) { const [a, b] = shuffle(r, pool).slice(0, 2); const [key, label] = STATS[Math.floor(r() * STATS.length)]; const A = careerStats(a.id), B = careerStats(b.id); if (!A || !B || A[key] === B[key]) continue;
    return { a: a.name, b: b.name, key, label, av: A[key], bv: B[key], win: A[key] > B[key] ? 0 : 1 }; }
  return null;
}
