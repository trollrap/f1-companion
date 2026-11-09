// Offline history of every Formula 1 season up to HISTORY_UPTO (generated from the open f1db dataset, see HANDOFF.md).
// Careers, past seasons, search lists and comparisons are answered from here in a few milliseconds instead of dozens of Jolpica requests.
// The current season (and anyone the file does not know, such as a 2026 rookie) still comes live from Jolpica.
import { driverChampion, constructorChampion } from '../data/champions';

let H = null, IX = null;
const load = () => {
  if (H) return H;
  H = require('../data/history.json');
  const byDid = {}, byName = {}, byName2 = {}, famCount = {}, idOf = [], idMap = {}, tIdMap = {};
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const strip = (s) => s.replace(/ (jr|sr)$/, '');
  const slug = (s) => norm(s).replace(/ /g, '_');
  H.d.forEach((d, i) => { famCount[slug(strip(norm(d[2])))] = (famCount[slug(strip(norm(d[2])))] || 0) + 1; });
  const lastYear = {}, firstYear = {};
  Object.keys(H.r).forEach((y) => H.r[y].forEach((rc) => rc[4].forEach((row) => { lastYear[row[0]] = +y; if (firstYear[row[0]] == null) firstYear[row[0]] = +y; })));
  H.d.forEach((d, i) => {
    const full = norm(`${d[1]} ${d[2]}`); (byName[full] = byName[full] || []).push(i);
    const k2 = norm(`${d[1]} ${strip(norm(d[2]))}`); (byName2[k2] = byName2[k2] || []).push(i);
    const fam = slug(strip(norm(d[2])));
    const id = famCount[fam] === 1 ? fam : `${slug(d[1])}_${slug(d[2])}`;
    idOf[i] = id; idMap[id] = i;
  });
  const pick = (a) => (a && a.length ? a.reduce((m, i) => (lastYear[i] > lastYear[m] ? i : m), a[0]) : -1);
  const t = {}; H.t.forEach((x, i) => { t[x[0]] = i; });
  IX = { byName, byName2, idOf, idMap, tIdMap: t, lastYear, firstYear, norm, strip, pick, learned: {} };
  // Champions are exact anchors between the Jolpica ids used in the app and this file.
  Object.keys(H.ds).forEach((y) => {
    const top = H.ds[y].find((x) => x[1] === 1), id = driverChampion(+y); if (top && id) IX.learned[id] = top[0];
    const ct = (H.cs[y] || []).find((x) => x[1] === 1), cid = constructorChampion(+y); if (ct && cid) IX.tIdMap[cid] = ct[0];
  });
  return H;
};

const dIdx = (id) => {
  load();
  if (IX.learned[id] != null) return IX.learned[id];
  return IX.idMap[id] != null ? IX.idMap[id] : -1;
};
// Called whenever a live row names a driver: the Jolpica id is tied to the matching driver in the file by name.
export function learn(id, first, last) {
  if (!id || !last || (IX && IX.learned[id] != null)) return;
  load();
  const a = IX.norm(`${first} ${last}`);
  let i = IX.pick(IX.byName[a]);
  if (i < 0) i = IX.pick(IX.byName2[IX.norm(`${first} ${IX.strip(IX.norm(last))}`)]);
  IX.learned[id] = i; // -1 = not in the file (rookie or reserve): stays live
}
const tIdx = (id) => { load(); return IX.tIdMap[id] != null ? IX.tIdMap[id] : -1; };
export const HISTORY_UPTO = () => load().upTo;
export const hasDriver = (id) => dIdx(id) >= 0;
export const hasTeam = (id) => tIdx(id) >= 0;
export const localYear = (y) => Number(y) <= load().upTo;
export const driverKey = (id) => { const i = dIdx(id); return i >= 0 ? IX.idOf[i] : id; };

const rowsOf = (i) => {
  const out = [];
  Object.keys(H.r).forEach((y) => H.r[y].forEach((rc) => rc[4].forEach((row) => { if (row[0] === i) out.push({ year: +y, rc, row }); })));
  return out;
};
const rowCache = {};
const driverRows = (i) => rowCache[i] || (rowCache[i] = rowsOf(i));
const seasonRowOf = (rc, row) => ({
  round: rc[0], race: rc[1], country: rc[2], date: rc[3], grid: row[2], position: row[3], positionText: row[4], points: row[5], status: row[6], fastest: row[7] === 1,
  teamId: H.t[row[1]][0], team: H.t[row[1]][1],
});
export function localDriverInfo(id) {
  const i = dIdx(id); if (i < 0) return null; const d = H.d[i];
  return { id, name: `${d[1]} ${d[2]}`, number: d[5] != null ? String(d[5]) : undefined, code: d[6], born: d[3] || null, nationality: d[4], url: null };
}
export function localSeasons(id) { const i = dIdx(id); if (i < 0) return null; return [...new Set(driverRows(i).map((x) => x.year))].sort((a, b) => b - a); }
export function localSeasonResults(year, id) {
  const i = dIdx(id); if (i < 0) return null;
  return driverRows(i).filter((x) => x.year === Number(year)).map((x) => seasonRowOf(x.rc, x.row)).sort((a, b) => a.round - b.round);
}
export function localSeasonQuali(year, id) {
  const i = dIdx(id); if (i < 0) return null; const y = String(year);
  const poles = (H.r[y] || []).filter((rc) => rc[5] && rc[5][0] === i).length;
  const q3 = H.q[y]?.[String(i)] || 0;
  return { poles, q3: q3 || (H.q[y] ? 0 : null) };
}
export function localCareer(id) {
  const i = dIdx(id); if (i < 0) return null; const rows = driverRows(i);
  let wins = 0, p = 0, fast = 0, pts = 0;
  rows.forEach(({ row }) => { if (row[4] === '1') wins++; if (['1', '2', '3'].includes(row[4])) p++; if (row[7] === 1) fast++; pts += row[5]; });
  Object.keys(H.sp).forEach((y) => { pts += H.sp[y][String(i)] || 0; });
  let poles = 0; Object.keys(H.r).forEach((y) => H.r[y].forEach((rc) => { if (rc[5] && rc[5][0] === i) poles++; }));
  const years = [...new Set(rows.map((x) => x.year))];
  return { races: rows.length, wins, podiums: p, poles, fastest: fast, points: Math.round(pts * 10) / 10, seasons: years.length, first: years.length ? Math.min(...years) : null, last: years.length ? Math.max(...years) : null };
}
export function localTeamsList(id) {
  const i = dIdx(id); if (i < 0) return null; const out = [];
  [...driverRows(i)].sort((a, b) => a.year - b.year || a.rc[0] - b.rc[0]).forEach(({ year, row }) => {
    const tid = H.t[row[1]][0], last = out[out.length - 1];
    if (last && last.teamId === tid) { last.to = year; last.races++; } else out.push({ teamId: tid, name: H.t[row[1]][1], from: year, to: year, races: 1 });
  });
  return out.reverse();
}
export function localAllDrivers() {
  load();
  return H.d.map((d, i) => ({ driverId: IX.idOf[i], name: `${d[1]} ${d[2]}`, first: d[1], last: d[2], code: d[6], number: d[5] != null ? String(d[5]) : undefined, nationality: d[4], dob: d[3], last_year: IX.lastYear[i], first_year: IX.firstYear[i] }))
    .map((x) => { const id = [...Object.keys(IX.learned)].find((k) => IX.learned[k] === IX.idMap[x.driverId]); return id ? { ...x, driverId: id } : x; });
}
export function localAllTeams() { load(); const seen = {}; return H.t.filter((x) => (seen[x[0]] ? false : (seen[x[0]] = true))).map((x) => ({ teamId: x[0], name: x[1], nationality: x[2] })); }

/* ---- standings of a finished season ---- */
export function localDriverStandings(year) {
  load(); const y = String(year); const list = H.ds[y]; if (!list) return null;
  const wins = {}, team = {};
  (H.r[y] || []).forEach((rc) => rc[4].forEach((row) => { if (row[4] === '1') wins[row[0]] = (wins[row[0]] || 0) + 1; team[row[0]] = row[1]; }));
  const out = [...list].sort((a, b) => a[1] - b[1]).map((s) => {
    const d = H.d[s[0]], t = H.t[team[s[0]]];
    const lid = Object.keys(IX.learned).find((k) => IX.learned[k] === s[0]) || IX.idOf[s[0]];
    return { position: s[1], points: s[2], wins: wins[s[0]] || 0, driverId: lid, name: `${d[1]} ${d[2]}`, first: d[1], last: d[2], code: d[6], permNumber: undefined, teamId: t?.[0], team: t?.[1] };
  });
  return Object.assign(out, { round: (H.r[y] || []).length });
}
export function localConstructorStandings(year) {
  load(); const y = String(year); const list = H.cs[y]; if (!list) return null;
  const wins = {}; (H.r[y] || []).forEach((rc) => rc[4].forEach((row) => { if (row[4] === '1') wins[row[1]] = (wins[row[1]] || 0) + 1; }));
  return Object.assign([...list].sort((a, b) => a[1] - b[1]).map((s) => ({ position: s[1], points: s[2], wins: wins[s[0]] || 0, teamId: H.t[s[0]][0], name: H.t[s[0]][1] })), { round: (H.r[y] || []).length });
}

/* ---- teams ---- */
export function localTeamSeasons(id) {
  const ti = tIdx(id); if (ti < 0) return null; const ys = new Set();
  Object.keys(H.r).forEach((y) => H.r[y].forEach((rc) => rc[4].forEach((row) => { if (row[1] === ti) ys.add(+y); })));
  return [...ys].sort((a, b) => b - a);
}
export function localTeamCareer(id) {
  const ti = tIdx(id); if (ti < 0) return null; let wins = 0, poles = 0; const ys = new Set();
  Object.keys(H.r).forEach((y) => H.r[y].forEach((rc) => { if (rc[5] && rc[5][1] === ti) poles++; rc[4].forEach((row) => { if (row[1] === ti) { ys.add(+y); if (row[4] === '1') wins++; } }); }));
  return { wins, poles, seasons: ys.size, first: ys.size ? Math.min(...ys) : null };
}
export function localTeamSeason(year, id) {
  const ti = tIdx(id); if (ti < 0) return null; const rl = H.r[String(year)] || []; let wins = 0, pod = 0, fast = 0, dnf = 0, poles = 0, doubles = 0; const rounds = [];
  rl.forEach((rc) => {
    const mine = rc[4].filter((row) => row[1] === ti); if (!mine.length) return; rounds.push(rc[0]);
    if (rc[5] && rc[5][1] === ti) poles++;
    const ps = mine.map((r) => r[4]); if (ps.includes('1') && ps.includes('2')) doubles++;
    mine.forEach((r) => { if (r[4] === '1') wins++; if (['1', '2', '3'].includes(r[4])) pod++; if (r[7] === 1) fast++; if (Number.isNaN(Number(r[4]))) dnf++; });
  });
  return { races: rounds.length, wins, podiums: pod, fastest: fast, doubles, dnf, poles };
}
export function localTeamDrivers(year, id) {
  const ti = tIdx(id); if (ti < 0) return null; const seen = {};
  (H.r[String(year)] || []).forEach((rc) => rc[4].forEach((row) => { if (row[1] === ti) seen[row[0]] = (seen[row[0]] || 0) + 1; }));
  return Object.keys(seen).sort((a, b) => seen[b] - seen[a]).slice(0, 4).map((k) => { const d = H.d[k]; return { driverId: IX.idOf[k], name: `${d[1]} ${d[2]}`, first: d[1], last: d[2], number: d[5] != null ? String(d[5]) : undefined, code: d[6] }; });
}
// Points after every round of a finished season (for the season chart).
export function localSeasonPoints(year) {
  load(); const y = String(year); const rl = H.r[y]; if (!rl) return null;
  const drv = {}, team = {};
  rl.forEach((rc) => rc[4].forEach((row) => {
    const d = H.d[row[0]], t = H.t[row[1]];
    const a = drv[row[0]] || (drv[row[0]] = { driverId: IX.idOf[row[0]], first: d[1], last: d[2], by: {} }); a.teamId = t[0]; a.by[rc[0]] = (a.by[rc[0]] || 0) + row[5];
    const b = team[row[1]] || (team[row[1]] = { teamId: t[0], name: t[1], by: {} }); b.by[rc[0]] = (b.by[rc[0]] || 0) + row[5];
  }));
  const rounds = rl.map((rc) => rc[0]);
  const cum = (by) => { let tt = 0; return rounds.map((r) => (tt += by[r] || 0)); };
  const fin = (l) => l.map((o) => ({ ...o, pts: cum(o.by) })).sort((a, b) => b.pts[b.pts.length - 1] - a.pts[a.pts.length - 1]);
  return { rounds: rl.map((rc) => ({ round: rc[0], name: rc[1] })), drivers: fin(Object.values(drv)), teams: fin(Object.values(team)) };
}

// Teammate battles: for every season, the head-to-head against each team-mate over the races they shared (qualifying = grid slot, race = finishing order).
export function localTeammates(id) {
  const i = dIdx(id); if (i < 0) return null; const out = {};
  Object.keys(H.r).forEach((y) => H.r[y].forEach((rc) => {
    const mine = rc[4].find((r) => r[0] === i); if (!mine) return;
    rc[4].forEach((m) => {
      if (m[0] === i || m[1] !== mine[1]) return;
      const k = `${y}:${m[0]}`; const o = (out[k] = out[k] || { year: +y, mate: m[0], team: H.t[mine[1]][1], races: 0, qa: 0, qb: 0, ra: 0, rb: 0, pa: 0, pb: 0 });
      const g = (r) => (r[2] > 0 ? r[2] : 99), p = (r) => (r[3] != null && r[3] > 0 ? r[3] : 99);
      o.races++; if (g(mine) < g(m)) o.qa++; else if (g(m) < g(mine)) o.qb++;
      if (p(mine) < p(m)) o.ra++; else if (p(m) < p(mine)) o.rb++;
      o.pa += mine[5] || 0; o.pb += m[5] || 0;
    });
  }));
  return Object.values(out).filter((o) => o.races >= 3).sort((a, b) => b.year - a.year || b.races - a.races).map((o) => { const d = H.d[o.mate]; return { ...o, mateName: `${d[1]} ${d[2]}`, mateId: IX.idOf[o.mate] }; });
}

// Raw race rows of one season for the what-if replay: [{round, name, rows: [{id, name, team, pos, pts, fast}]}]
export const historyYears = () => Object.keys(load().r).map(Number).sort((a, b) => b - a);
export function seasonRaw(year) {
  load(); const rs = H.r[year]; if (!rs) return null;
  return rs.map((rc) => ({ round: rc[0], name: rc[1], rows: rc[4].map((r) => ({ id: IX.idOf[r[0]] || String(r[0]), name: `${H.d[r[0]][1]} ${H.d[r[0]][2]}`, team: H.t[r[1]][1], pos: r[3] != null && r[3] > 0 ? r[3] : null, pts: r[5] || 0, fast: r[7] === 1 })) }));
}
