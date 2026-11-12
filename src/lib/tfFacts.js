import { raceRowsOf, roundsOf, historyYears, localDriverInfo, localDriverStandings } from '../api/history';
import { driverChampion } from '../data/champions';
// True or false statements written from the offline race history, so every answer is checked against data.
const pickOf = (a, r) => a[Math.floor(r() * a.length)];
export function makeFact(r) {
  const years = historyYears().filter((y) => y >= 1980 && y <= 2025);
  for (let t = 0; t < 40; t++) {
    const kind = Math.floor(r() * 5); const y = pickOf(years, r); const truth = r() < 0.5;
    if (kind === 3) { const id = driverChampion(y); const st = localDriverStandings(y); if (!id || !st || st.length < 5) continue; const info = localDriverInfo(id); const champ = st[0]; const other = pickOf(st.slice(1, 5), r); const nm = truth ? champ.name : other.name; if (!info) continue;
      return { text: `${nm} won the ${y} drivers' championship.`, truth, why: `${champ.name} was the ${y} champion with ${champ.points} points.` }; }
    if (kind === 4) { const st = localDriverStandings(y); if (!st) continue; const d = pickOf(st.slice(0, 12), r); const info = localDriverInfo(d.driverId); const born = info && info.born ? Number(String(info.born).slice(0, 4)) : null; if (!born) continue; const off = pickOf([-4, -3, -2, -1, 1, 2, 3, 4], r);
      return { text: `${d.name} was born in ${truth ? born : born + off}.`, truth, why: `${d.name} was born on ${info.born}.` }; }
    const rs = roundsOf(y); if (!rs.length) continue; const rd = pickOf(rs, r); const R = raceRowsOf(y, rd.round); if (!R) continue;
    const win = R.rows.find((x) => x.pos === 1), pole = R.rows.find((x) => x.grid === 1); if (!win) continue;
    if (kind === 0) { const others = R.rows.filter((x) => x !== win && x.pos && x.pos <= 8); if (!others.length) continue; const nm = truth ? win.full : pickOf(others, r).full; return { text: `${nm} won the ${y} ${R.name}.`, truth, why: `${win.full} won it, starting from P${win.grid}.` }; }
    if (kind === 1) { if (!pole) continue; const others = R.rows.filter((x) => x !== pole && x.grid <= 6); if (!others.length) continue; const nm = truth ? pole.full : pickOf(others, r).full; return { text: `${nm} started the ${y} ${R.name} from pole position.`, truth, why: `${pole.full} took pole position.` }; }
    if (kind === 2) { if (win.grid > 15) continue; const claim = pickOf([3, 5], r); const real = win.grid <= claim; return { text: `The ${y} ${R.name} was won by a driver who started in the top ${claim}.`, truth: real, why: `${win.full} won it, starting from P${win.grid}.` }; }
  }
  return null;
}
