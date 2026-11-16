import { driversMeta, firstWinOf, historyYears, localDriverInfo } from '../api/history';
import { driverChampion } from '../data/champions';

let POOL = null;
// Dated events built from the offline history: debuts, first wins and first titles of well-known drivers.
function pool() {
  if (POOL) return POOL; const out = []; const firstTitle = {};
  historyYears().slice().sort((a, b) => a - b).forEach((y) => { const id = driverChampion(y); if (id && !(id in firstTitle)) firstTitle[id] = y; });
  driversMeta().filter((d) => d.races >= 110 || d.champ).forEach((d) => {
    out.push({ year: d.first, text: `${d.name} makes their F1 debut` });
    let w = null; try { w = firstWinOf(d.id); } catch {} if (w && w.year) out.push({ year: w.year, text: `${d.name} wins their first Grand Prix` });
    if (firstTitle[d.id]) { const n = localDriverInfo(d.id); out.push({ year: firstTitle[d.id], text: `${(n && n.name) || d.name} wins their first world title` }); }
  });
  POOL = out; return out;
}
// Five events with five different years, at least two years apart, in shuffled order. `year` is the answer.
export function makeTimeline(r) {
  const P = pool().slice(); for (let i = P.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  const pick = []; for (const e of P) { if (pick.every((x) => Math.abs(x.year - e.year) >= 2)) pick.push(e); if (pick.length === 5) break; }
  return pick.length === 5 ? pick : null;
}
