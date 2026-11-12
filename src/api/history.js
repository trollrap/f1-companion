// Offline history of every Formula 1 season up to HISTORY_UPTO (generated from the open f1db dataset, see HANDOFF.md).
// Careers, past seasons, search lists and comparisons are answered from here in a few milliseconds instead of dozens of Jolpica requests.
// The current season (and anyone the file does not know, such as a 2026 rookie) still comes live from Jolpica.
import { driverChampion, constructorChampion, driverChampionYears, constructorChampionYears } from '../data/champions';

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
export function sprintPoints(year) {
  load(); const m = H.sp[String(year)]; if (!m) return {}; const out = {};
  Object.keys(m).forEach((k) => { const i = Number(k); out[IX.idOf[i] || String(i)] = m[k]; });
  return out;
}
export function seasonRaw(year) {
  load(); const rs = H.r[year]; if (!rs) return null;
  return rs.map((rc) => ({ round: rc[0], name: rc[1], rows: rc[4].map((r) => ({ id: IX.idOf[r[0]] || String(r[0]), name: `${H.d[r[0]][1]} ${H.d[r[0]][2]}`, team: H.t[r[1]][1], pos: r[3] != null && r[3] > 0 ? r[3] : null, pts: r[5] || 0, fast: r[7] === 1 })) }));
}
// Past winners of a Grand Prix of this name (offline history). Matches by race name, so a race that moved circuits is shown together.
export function raceHistory(name) {
  load(); if (!name) return null; const key = String(name).toLowerCase().trim(); const out = [];
  Object.keys(H.r).forEach((y) => H.r[y].forEach((rc) => { if (String(rc[1]).toLowerCase().trim() !== key) return; const w = rc[4].find((r) => r[4] === '1'); if (!w) return; const pole = rc[5] ? rc[5][0] : null;
    out.push({ year: +y, id: IX.idOf[w[0]] || String(w[0]), name: `${H.d[w[0]][1]} ${H.d[w[0]][2]}`, team: H.t[w[1]][1], grid: w[2], pole: pole != null ? `${H.d[pole][1]} ${H.d[pole][2]}` : null }); }));
  if (!out.length) return null; out.sort((a, b) => b.year - a.year);
  const cnt = {}; out.forEach((x) => { cnt[x.name] = (cnt[x.name] || 0) + 1; }); const top = Object.entries(cnt).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([n, c]) => ({ name: n, wins: c }));
  const fromPole = out.filter((x) => x.grid === 1).length;
  return { list: out, top, races: out.length, fromPole, first: out[out.length - 1].year };
}
// One past race as a list of results (real grid, finishing order and status), for the Time machine.
export function raceRowsOf(year, round) {
  load(); const rc = (H.r[year] || []).find((x) => x[0] === round); if (!rc) return null;
  const rows = rc[4].map((r) => ({ id: IX.idOf[r[0]] || String(r[0]), name: `${H.d[r[0]][2]}`, full: `${H.d[r[0]][1]} ${H.d[r[0]][2]}`, code: H.d[r[0]][6] || String(H.d[r[0]][2]).slice(0, 3).toUpperCase(), teamId: H.t[r[1]][0], team: H.t[r[1]][1], grid: r[2] > 0 ? r[2] : 20, pos: r[3] != null && r[3] > 0 ? r[3] : null, posText: r[4], status: r[6] || '', pts: r[5] || 0 }));
  return { round, name: rc[1], country: rc[2], date: rc[3], rows };
}
export const roundsOf = (year) => { load(); return (H.r[year] || []).map((rc) => ({ round: rc[0], name: rc[1], date: rc[3] })); };
// Driver DNA: six 0-100 scores from every race the driver started in the history.
export function dnaOf(id) {
  const i = dIdx(id); if (i < 0) return null; const rows = driverRows(i).map((x) => x.row).filter((r) => r[3] != null);
  if (rows.length < 8) return null;
  const fin = rows.filter((r) => r[3] > 0 && /^\d+$/.test(String(r[4]))), n = rows.length;
  const gr = rows.filter((r) => r[2] > 0); const avgGrid = gr.length ? gr.reduce((a, r) => a + r[2], 0) / gr.length : 12;
  const gain = gr.filter((r) => /^\d+$/.test(String(r[4])) && r[3] > 0); const avgGain = gain.length ? gain.reduce((a, r) => a + (r[2] - r[3]), 0) / gain.length : 0;
  const pos = fin.map((r) => r[3]); const mean = pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : 15; const sd = pos.length ? Math.sqrt(pos.reduce((a, b) => a + (b - mean) ** 2, 0) / pos.length) : 6;
  const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
  return { races: n, axes: [
    ['Qualifying', clamp(100 - (avgGrid - 1) * 6)], ['Racecraft', clamp(50 + avgGain * 10)], ['Consistency', clamp(100 - sd * 7)],
    ['Reliability', clamp((fin.length / n) * 100)], ['Podiums', clamp((rows.filter((r) => r[3] > 0 && r[3] <= 3 && /^\d+$/.test(String(r[4]))).length / n) * 170)], ['Fast laps', clamp((rows.filter((r) => r[7] === 1).length / n) * 500)] ] };
}

// Every team a driver raced for, as stints (consecutive seasons with one team), with wins and the seasons they won the title.
export function driverTimeline(id) {
  const i = dIdx(id); if (i < 0) return null; const rows = driverRows(i); if (!rows.length) return null;
  const byYear = {}; rows.forEach(({ year, row }) => { const y = (byYear[year] = byYear[year] || {}); const t = H.t[row[1]]; const k = t[0]; y[k] = y[k] || { teamId: k, team: t[1], races: 0, wins: 0 }; y[k].races++; if (row[4] === '1') y[k].wins++; });
  const stints = []; Object.keys(byYear).map(Number).sort((a, b) => a - b).forEach((y) => { const main = Object.values(byYear[y]).sort((a, b) => b.races - a.races)[0]; const last = stints[stints.length - 1];
    if (last && last.teamId === main.teamId && y - last.to <= 1) { last.to = y; last.races += main.races; last.wins += main.wins; } else stints.push({ teamId: main.teamId, team: main.team, from: y, to: y, races: main.races, wins: main.wins }); });
  let titles = []; try { titles = driverChampionYears(id).filter((y) => byYear[y]); } catch {}
  return { stints, titles, from: stints[0].from, to: stints[stints.length - 1].to };
}
export function lastTeamOf(id) { const i = dIdx(id); if (i < 0) return null; const rows = driverRows(i); if (!rows.length) return null; const r = rows.reduce((a, b) => (b.year >= a.year ? b : a)); return { teamId: H.t[r.row[1]][0], team: H.t[r.row[1]][1] }; }
// Every result line of a past season with its status text (for the reliability report).
export function localSeasonStatuses(year) {
  load(); const rcs = H.r[year]; if (!rcs) return null;
  return rcs.flatMap((rc) => rc[4].map((r) => ({ round: rc[0], race: rc[1], teamId: H.t[r[1]][0], team: H.t[r[1]][1], driverId: IX.idOf[r[0]] || String(r[0]), last: H.d[r[0]][2], status: r[6] || '', finished: /^(Finished|\+\d+ Laps?)$/i.test(r[6] || '') })));
}

// Every team that ever appears in the history: first and last season, race starts, wins and titles (for the team family trees).
let ERAS = null;
export function teamEras() {
  if (ERAS) return ERAS; load(); const m = {};
  Object.keys(H.r).forEach((y) => H.r[y].forEach((rc) => rc[4].forEach((r) => { const t = H.t[r[1]]; const e = (m[t[0]] = m[t[0]] || { id: t[0], name: t[1], first: +y, last: +y, starts: 0, wins: 0, names: {} }); e.first = Math.min(e.first, +y); e.last = Math.max(e.last, +y); e.starts++; if (r[4] === '1') e.wins++; e.names[t[1]] = (e.names[t[1]] || 0) + 1; })));
  Object.values(m).forEach((e) => { let t = 0; try { t = constructorChampionYears(e.id).length; } catch {} e.titles = t; e.name = Object.entries(e.names).sort((a, b) => b[1] - a[1])[0][0]; delete e.names; });
  ERAS = m; return m;
}

// Races held and drivers born on a calendar day (month-day), for the "on this day" stat.
export function onThisDay(md) {
  load(); const races = [], births = [];
  Object.keys(H.r).forEach((y) => H.r[y].forEach((rc) => { if (String(rc[3]).slice(5) === md) { const w = rc[4].find((r) => r[4] === '1'); if (w) races.push({ year: +y, name: rc[1], winner: `${H.d[w[0]][1]} ${H.d[w[0]][2]}` }); } }));
  H.d.forEach((d) => { if (d && String(d[3] || '').slice(5) === md) births.push({ name: `${d[1]} ${d[2]}`, year: Number(String(d[3]).slice(0, 4)) }); });
  return { races, births };
}

// Regular race seats of a season: for each team the two drivers with the most starts (for Build the grid).
export function seasonGrid(year) {
  load(); const cnt = {};
  (H.r[String(year)] || []).forEach((rc) => rc[4].forEach((r) => { const c = (cnt[r[1]] ||= {}); c[r[0]] = (c[r[0]] || 0) + 1; }));
  return Object.keys(cnt).map((t) => ({ teamId: H.t[t][0], name: H.t[t][1], drivers: Object.entries(cnt[t]).sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 2).map(([k]) => ({ driverId: IX.idOf[k], name: `${H.d[k][1]} ${H.d[k][2]}`, last: H.d[k][2] })) })).sort((a, b) => a.name.localeCompare(b.name));
}
export function firstWinOf(id) { const i = dIdx(id); if (i < 0) return null; let best = null; driverRows(i).forEach(({ year, rc, row }) => { if (row[4] === '1' && (!best || String(rc[3]) < best.date)) best = { year, date: String(rc[3]), name: rc[1] }; }); return best; }
export function dobOf(id) { const i = dIdx(id); return i < 0 ? null : H.d[i][3] || null; }
export function titlesOf(id) { load(); const i = dIdx(id); if (i < 0) return 0; return historyYears().filter((y) => driverChampion(y) && dIdx(driverChampion(y)) === i).length; }

// Passing by race: for every Grand Prix name, the average number of places finishers moved between grid and flag, and how often pole won.
// Counts classified finishers who started on the grid. Pit stops and strategy move cars too, so this is "position change", not a count of overtakes.
export function passingByRace(sinceYear) {
  load(); const by = {};
  Object.keys(H.r).forEach((y) => { if (+y < sinceYear) return; H.r[y].forEach((rc) => {
    const o = (by[rc[1]] ||= { name: rc[1], races: 0, moved: 0, n: 0, poleWins: 0, poleRaces: 0, winnerGain: 0, lastYear: 0 });
    o.races++; o.lastYear = Math.max(o.lastYear, +y);
    rc[4].forEach((r) => { if (r[2] > 0 && r[3] > 0 && /^\d+$/.test(String(r[4]))) { o.moved += Math.abs(r[2] - r[3]); o.n++; } });
    const w = rc[4].find((r) => r[4] === '1'); const p = rc[4].find((r) => r[2] === 1);
    if (w && w[2] > 0) o.winnerGain += w[2] - 1; if (p && w) { o.poleRaces++; if (p === w) o.poleWins++; }
  }); });
  return Object.values(by).filter((o) => o.n >= 40).map((o) => ({ name: o.name, races: o.races, avgMoved: o.moved / o.n, poleRate: o.poleRaces ? o.poleWins / o.poleRaces : 0, avgWinnerStart: 1 + o.winnerGain / o.races, lastYear: o.lastYear }));
}
// One season in numbers, for comparing two seasons side by side.
export function seasonFacts(year) {
  load(); const y = String(year); const rl = H.r[y]; if (!rl || !rl.length) return null;
  const wins = {}, teamWins = {}; let starts = 0, fin = 0, poles = {}, cars = 0;
  rl.forEach((rc) => { cars += rc[4].length; rc[4].forEach((r) => { starts++; if (/^\d+$/.test(String(r[4]))) fin++; if (r[4] === '1') { wins[r[0]] = (wins[r[0]] || 0) + 1; teamWins[r[1]] = (teamWins[r[1]] || 0) + 1; } }); const p = rc[4].find((r) => r[2] === 1); if (p) poles[p[0]] = (poles[p[0]] || 0) + 1; });
  const top = (m, names) => { const e = Object.entries(m).sort((a, b) => b[1] - a[1])[0]; return e ? { name: names(e[0]), n: e[1] } : null; };
  const std = (H.ds[y] || []).slice().sort((a, b) => a[1] - b[1]);
  const nm = (k) => `${H.d[k][1]} ${H.d[k][2]}`;
  return { year: +year, races: rl.length, winners: Object.keys(wins).length, avgCars: cars / rl.length, finishRate: fin / starts,
    mostWins: top(wins, nm), mostTeamWins: top(teamWins, (k) => H.t[k][1]), mostPoles: top(poles, nm),
    champion: std[0] ? nm(std[0][0]) : null, champPts: std[0] ? std[0][2] : null, secondPts: std[1] ? std[1][2] : null, thirdPts: std[2] ? std[2][2] : null };
}

// A season as a story: who led the title race and when, the best comeback win, podium table and race winners. Offline.
export function seasonStory(year) {
  load(); const y = String(year); const rl = H.r[y]; const sp = localSeasonPoints(year); if (!rl || !rl.length || !sp) return null;
  const leaders = sp.rounds.map((_, k) => { let best = null; sp.drivers.forEach((d) => { if (!best || (d.pts[k] || 0) > (best.pts[k] || 0)) best = d; }); return best; });
  const nm = (d) => `${d.first} ${d.last}`; const final = leaders[leaders.length - 1];
  let changes = 0; for (let k = 1; k < leaders.length; k++) if (leaders[k] !== leaders[k - 1]) changes++;
  let forGood = 0; for (let k = leaders.length - 1; k >= 0; k--) { if (leaders[k] !== final) { forGood = sp.rounds[k + 1].round; break; } }
  const winners = rl.map((rc) => { const w = rc[4].find((r) => r[4] === '1'); return { round: rc[0], name: rc[1], winner: w ? `${H.d[w[0]][1]} ${H.d[w[0]][2]}` : '-', grid: w ? w[2] : 0, team: w ? H.t[w[1]][1] : '' }; });
  const comeback = winners.filter((w) => w.grid > 0).sort((a, b) => b.grid - a.grid)[0];
  const pod = {}; rl.forEach((rc) => rc[4].forEach((r) => { if (['1', '2', '3'].includes(r[4])) pod[r[0]] = (pod[r[0]] || 0) + 1; }));
  const topPod = Object.entries(pod).sort((a, b) => b[1] - a[1])[0];
  const lead = leaders.map((d) => nm(d)); const leadersSeen = [...new Set(lead)];
  return { year: +year, champion: nm(final), leadChanges: changes, leaderForGoodAfter: forGood, leadersSeen, winners, comeback: comeback && comeback.grid > 1 ? comeback : null, mostPodiums: topPod ? { name: `${H.d[topPod[0]][1]} ${H.d[topPod[0]][2]}`, n: topPod[1] } : null };
}
// Drivers whose first season was `year` (with their debut race) and whose last season in the history was `year` (with their last race and career wins).
export function debutsOf(year) {
  load(); const up = H.upTo; const deb = [], far = [];
  H.d.forEach((d, i) => {
    const fy = IX.firstYear[i], ly = IX.lastYear[i]; if (fy !== year && ly !== year) return; const rows = driverRows(i);
    const nameOf = `${d[1]} ${d[2]}`;
    if (fy === year) { const f = rows.filter((x) => x.year === year).sort((a, b) => a.rc[0] - b.rc[0])[0]; if (f) deb.push({ id: IX.idOf[i], name: nameOf, nat: d[4], round: f.rc[0], race: f.rc[1], team: H.t[f.row[1]][1], grid: f.row[2], pos: f.row[4], dnf: !/^\d+$/.test(String(f.row[4])) }); }
    if (ly === year && year < up) { const l = rows.filter((x) => x.year === year).sort((a, b) => b.rc[0] - a.rc[0])[0]; const wins = rows.filter((x) => x.row[4] === '1').length; if (l) far.push({ id: IX.idOf[i], name: nameOf, nat: d[4], round: l.rc[0], race: l.rc[1], team: H.t[l.row[1]][1], starts: rows.length, wins }); }
  });
  deb.sort((a, b) => a.round - b.round || a.name.localeCompare(b.name)); far.sort((a, b) => b.wins - a.wins || b.starts - a.starts);
  return { debuts: deb, farewells: far, upTo: up };
}
