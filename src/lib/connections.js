import { driversMeta, teamNameOf } from '../api/history';
// Connections: 12 drivers that fall into 3 hidden groups of 4. Each chosen driver fits exactly one of the three groups, so there is only one right answer.
const shuf = (a, r) => { const x = [...a]; for (let k = x.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [x[k], x[j]] = [x[j], x[k]]; } return x; };
export function makeConnections(r) {
  const all = driversMeta().filter((d) => d.races >= 30 && d.lastYear >= 1985);
  const natN = {}, teamN = {}; all.forEach((d) => { natN[d.nat] = (natN[d.nat] || 0) + 1; d.teams.forEach((t) => { teamN[t] = (teamN[t] || 0) + 1; }); });
  const nats = Object.keys(natN).filter((n) => natN[n] >= 6), teams = Object.keys(teamN).filter((t) => teamN[t] >= 14);
  const make = () => { const c = []; const kinds = shuf(['nat', 'champ', 'team', 'debut', 'team', 'nat'], r);
    for (const k of kinds) { if (c.length >= 3) break;
      if (k === 'nat') { const n = nats[Math.floor(r() * nats.length)]; if (!c.some((x) => x.k === 'nat' && x.v === n)) c.push({ k, v: n, label: `${n} drivers`, f: (d) => d.nat === n }); }
      else if (k === 'champ') { if (!c.some((x) => x.k === 'champ')) c.push({ k, v: 1, label: 'World champions', f: (d) => d.champ }); }
      else if (k === 'team') { const t = teams[Math.floor(r() * teams.length)]; if (!c.some((x) => x.k === 'team' && x.v === t)) c.push({ k, v: t, label: `Raced for ${teamNameOf(t)}`, f: (d) => d.teams.has(t) }); }
      else if (k === 'debut') { const dec = [1980, 1990, 2000, 2010][Math.floor(r() * 4)]; if (!c.some((x) => x.k === 'debut' && x.v === dec)) c.push({ k, v: dec, label: `First raced in the ${dec}s`, f: (d) => d.first >= dec && d.first < dec + 10 }); } }
    return c.length === 3 ? c : null; };
  for (let t = 0; t < 300; t++) {
    const c = make(); if (!c) continue;
    const groups = c.map((g, i) => ({ label: g.label, pool: all.filter((d) => g.f(d) && c.every((h, j) => j === i || !h.f(d))) }));
    if (groups.some((g) => g.pool.length < 4)) continue;
    const out = groups.map((g) => ({ label: g.label, items: shuf(g.pool, r).slice(0, 4).map((d) => d.name) }));
    return { groups: out, tiles: shuf(out.flatMap((g) => g.items), r) };
  }
  return null;
}
