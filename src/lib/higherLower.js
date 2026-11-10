import { localAllDrivers, localCareer } from '../api/history';
// Higher or lower: two drivers, one career stat, pick who has more. Built from the offline history.
export const STATS = [['wins', 'race wins'], ['podiums', 'podiums'], ['poles', 'pole positions'], ['points', 'career points'], ['races', 'race starts'], ['fastest', 'fastest laps']];
let POOL = null;
export function nextPair(rand = Math.random) {
  if (!POOL) POOL = localAllDrivers().filter((d) => (d.last_year || 0) >= 1985);
  if (POOL.length < 2) return null;
  for (let n = 0; n < 40; n++) {
    const a = POOL[Math.floor(rand() * POOL.length)], b = POOL[Math.floor(rand() * POOL.length)]; if (a.driverId === b.driverId) continue;
    const ca = localCareer(a.driverId), cb = localCareer(b.driverId); if (!ca || !cb || ca.races < 20 || cb.races < 20) continue;
    const st = STATS[Math.floor(rand() * STATS.length)]; const va = ca[st[0]], vb = cb[st[0]]; if (va === vb) continue;
    return { a: { name: a.name, v: va }, b: { name: b.name, v: vb }, stat: st[1] };
  }
  return null;
}
