// Jolpica-F1: Ergast-compatible history, results and standings. No live timing.
// Routes follow Jolpica's docs: season first, then /drivers/{id}, /constructors/{id}, /fastest/{rank}, endpoints end in .json or /.
// The position filter (/results/1) is NOT in Jolpica's docs, so it is probed at runtime and falls back to counting rows.
import { CALENDAR_2027, GRID_2027 } from '../data/season2027';
import { cachedJSON, memo, MIN, HOUR, DAY } from '../lib/cache';
import { YEAR } from './openf1';
import { driverChampionYears, constructorChampionYears } from '../data/champions';
import * as LH from './history';
const BASE = 'https://api.jolpi.ca/ergast/f1';
// Finished seasons never change, so they are kept (almost) for good: the second visit is instant.
const PAST = 58 * DAY, ttlFor = (year, ttl) => (Number(year) < YEAR ? PAST : ttl);
const get = (path, ttl) => cachedJSON(`${BASE}${path}`, ttl).then((j) => j.MRData);
const total = async (path, ttl = DAY) => Number((await get(`${path}${path.includes('?') ? '&' : '?'}limit=1`, ttl)).total);
// Reads every page (100 rows max per page) of a listing.
async function pageAll(path, rowsOf, ttl = DAY, maxPages = 8) {
  const q = (o) => `${path}${path.includes('?') ? '&' : '?'}limit=100&offset=${o}`;
  const first = await get(q(0), ttl); const rows = [...rowsOf(first)];
  const pages = Math.min(maxPages, Math.ceil(Number(first.total) / 100));
  if (pages > 1) { const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => get(q((i + 1) * 100), ttl))); rest.forEach((d) => rows.push(...rowsOf(d))); }
  return rows;
}
const N = (v, d = null) => { const x = Number(v); return v == null || v === '' || !Number.isFinite(x) ? d : x; };
const resultRows = (d) => d.RaceTable.Races.flatMap((race) => race.Results.map((r) => ({ race, r })));
const qualiRows = (d) => d.RaceTable.Races.flatMap((race) => race.QualifyingResults.map((r) => ({ race, r })));

const mapRow = (r) => (LH.learn(r.Driver.driverId, r.Driver.givenName, r.Driver.familyName), {
  position: Number(r.position), positionText: r.positionText, driver: `${r.Driver.givenName} ${r.Driver.familyName}`, first: r.Driver.givenName, last: r.Driver.familyName, code: r.Driver.code,
  driverId: r.Driver.driverId, team: r.Constructor?.name, teamId: r.Constructor?.constructorId, grid: N(r.grid, -1),
  time: r.Time?.time ?? r.status, points: N(r.points, 0), fastest: r.FastestLap?.rank === '1', status: r.status,
});
export async function lastRace(year) {
  const d = await get(`/${year}/last/results.json`, ttlFor(year, 3 * MIN));
  const race = d.RaceTable.Races[0];
  return race && { round: Number(race.round), date: race.date, name: race.raceName, rows: race.Results.map(mapRow) };
}
export async function sessionResults(year, round, kind /* results | qualifying | sprint */) {
  const d = await get(`/${year}/${round}/${kind}.json`, ttlFor(year, 5 * MIN));
  const race = d.RaceTable.Races[0];
  if (!race) return null;
  if (kind === 'qualifying') return race.QualifyingResults.map((r) => (LH.learn(r.Driver.driverId, r.Driver.givenName, r.Driver.familyName), {
    position: Number(r.position), driver: `${r.Driver.givenName} ${r.Driver.familyName}`, first: r.Driver.givenName, last: r.Driver.familyName, driverId: r.Driver.driverId, team: r.Constructor.name, teamId: r.Constructor.constructorId, q1: r.Q1, q2: r.Q2, q3: r.Q3 }));
  return (race.SprintResults || race.Results).map(mapRow);
}
export async function driverStandings(year) {
  if (LH.localYear(year)) { const l = LH.localDriverStandings(year); if (l && l.length) return l; }
  let d;
  try { d = await get(`/${year}/driverstandings.json`, ttlFor(year, 10 * MIN)); } catch (e) {
    // The live feed is unreachable (a friend's network, a Jolpica outage): use the saved results so drivers still show, newest season we have.
    for (const y of [Number(year), Number(year) - 1]) { const l = LH.localDriverStandings(y); if (l && l.length) return l; }
    throw e;
  }
  const list = d.StandingsTable.StandingsLists[0];
  return Object.assign((list?.DriverStandings || []).map((s) => (LH.learn(s.Driver.driverId, s.Driver.givenName, s.Driver.familyName), {
    position: Number(s.position), points: Number(s.points), wins: Number(s.wins), driverId: s.Driver.driverId,
    name: `${s.Driver.givenName} ${s.Driver.familyName}`, first: s.Driver.givenName, last: s.Driver.familyName, code: s.Driver.code, permNumber: s.Driver.permanentNumber, teamId: s.Constructors?.at(-1)?.constructorId, team: s.Constructors?.at(-1)?.name })), { round: Number(list?.round) });
}
export async function constructorStandings(year) {
  if (LH.localYear(year)) { const l = LH.localConstructorStandings(year); if (l && l.length) return l; }
  const d = await get(`/${year}/constructorstandings.json`, ttlFor(year, 10 * MIN));
  const list = d.StandingsTable.StandingsLists[0];
  return Object.assign((list?.ConstructorStandings || []).map((s) => ({
    position: Number(s.position), points: Number(s.points), wins: Number(s.wins), teamId: s.Constructor.constructorId, name: s.Constructor.name })), { round: Number(list?.round) });
}
// Winner per round: { round: { last, teamId, team } }. Uses the position filter when the server honours it, otherwise reads the full results.
export async function winnersByRound(year) {
  let races = null;
  try {
    const d = await get(`/${year}/results/1.json?limit=100`, ttlFor(year, 3 * MIN));
    if (d.RaceTable.Races.every((r) => r.Results.length === 1 && r.Results[0].position === '1')) races = d.RaceTable.Races.map((r) => ({ round: r.round, r: r.Results[0] }));
  } catch {}
  if (!races) races = (await pageAll(`/${year}/results.json`, resultRows, ttlFor(year, 3 * MIN))).filter((x) => x.r.position === '1').map((x) => ({ round: x.race.round, r: x.r }));
  const out = {}; races.forEach((x) => { out[Number(x.round)] = { last: x.r.Driver.familyName, code: x.r.Driver.code || String(x.r.Driver.familyName).slice(0, 3).toUpperCase(), teamId: x.r.Constructor?.constructorId, team: x.r.Constructor?.name }; });
  return out;
}
// The full schedule with every session start (UTC). Used for round numbers, sprint weekends and as a fallback for OpenF1.
export async function jolpicaSchedule(year) {
  // 2027 is already announced; until the data server publishes it, the built-in copy of the announced calendar is shown.
  let live = null; try { const d = await get(`/${year}/races.json?limit=100`, ttlFor(year, 6 * HOUR)); live = d.RaceTable.Races.map((r) => ({ ...r, round: Number(r.round) })); } catch (e) { if (year !== 2027) throw e; }
  if (year === 2027 && (!live || live.length < 20)) return CALENDAR_2027.map((r) => ({ ...r, round: Number(r.round) }));
  return live;
}

/* ---------- drivers and teams ---------- */
const seasonRow = (race, r) => ({
  round: Number(race.round), race: race.raceName, country: race.Circuit?.Location?.country, date: race.date, grid: N(r.grid, -1), position: N(r.position, 99), positionText: r.positionText,
  points: N(r.points, 0), status: r.status, fastest: r.FastestLap?.rank === '1', teamId: r.Constructor?.constructorId, team: r.Constructor?.name,
});
// Is this driver racing in the live season? (the current standings are cached and tiny)
const racingNow = async (id) => { try { return (await driverStandings(YEAR)).some((x) => x.driverId === id); } catch { return false; } };
export async function driverInfo(id) {
  const lo = LH.localDriverInfo(id); if (lo) return lo;
  const d = (await get(`/drivers/${id}.json`, 7 * 24 * HOUR)).DriverTable.Drivers[0];
  return d && { id: d.driverId, name: `${d.givenName} ${d.familyName}`, number: d.permanentNumber, code: d.code, born: d.dateOfBirth, nationality: d.nationality, url: d.url };
}
export async function constructorInfo(id) {
  const c = (await get(`/constructors/${id}.json`, 7 * 24 * HOUR)).ConstructorTable.Constructors[0];
  return c && { id: c.constructorId, name: c.name, nationality: c.nationality, url: c.url };
}
export async function driverSeasonResults(year, id) {
  if (LH.localYear(year)) { const l = LH.localSeasonResults(year, id); if (l) return l; }
  const d = await get(`/${year}/drivers/${id}/results.json?limit=100`, ttlFor(year, 10 * MIN));
  return d.RaceTable.Races.map((race) => seasonRow(race, race.Results[0]));
}
export async function driverSeasonQuali(year, id) {
  if (LH.localYear(year)) { const l = LH.localSeasonQuali(year, id); if (l) return l; }
  const rows = await pageAll(`/${year}/drivers/${id}/qualifying.json`, qualiRows, ttlFor(year, 30 * MIN), 1);
  return { poles: rows.filter((x) => x.r.position === '1').length, q3: rows.filter((x) => !!x.r.Q3).length };
}
export const driverSeasonPoles = async (year, id) => (await driverSeasonQuali(year, id)).poles;
// Count of rows at one position. Returns null when the server ignores the filter (the filtered total would equal the unfiltered total).
async function countAt(scope, kind, pos, allCount) {
  try {
    const n = Number((await get(`${scope}/${kind}/${pos}.json?limit=1`, DAY)).total);
    return allCount === 0 || n < allCount ? n : null;
  } catch { return null; }
}
// Every piece of a career or team record loads on its own: one endpoint failing leaves a dash for that figure, never an error screen.
const settle = async (p) => { try { return await p; } catch { return null; } };
const sprintRows = (d) => d.RaceTable.Races.flatMap((race) => (race.SprintResults || []).map((r) => ({ race, r })));
const sumPts = (rows) => Math.round(rows.reduce((a, x) => a + Number(x.r.points || 0), 0) * 10) / 10;

// Titles come from the built-in list of champions (see data/champions.js). A title in progress is never counted.
export async function driverTitles(id, year) { return driverChampionYears(id).filter((y) => y <= year).length; }
export async function constructorTitles(id, year) { return constructorChampionYears(id).filter((y) => y < year).length; }
const lowGet = (path, ttl) => cachedJSON(`${BASE}${path}`, ttl, { low: true }).then((j) => j.MRData);

// A driver's career from small "count only" requests (limit=1) that all run at once, instead of paging every result: a few KB instead of ~15 pages.
// Points need every result row, so they load separately (driverPoints) and fill in afterwards.
export async function driverCareer(id, year) {
  const lo = LH.localCareer(id);
  if (lo) {
    // Finished seasons come from the built-in history; the live season (if he is racing in it) is added on top.
    let c = { races: lo.races, wins: lo.wins, podiums: lo.podiums, poles: lo.poles, fastest: lo.fastest, seasons: lo.seasons, first: lo.first };
    if (await racingNow(id)) {
      const rows = await settle(driverSeasonResults(YEAR, id)); const q = await settle(driverSeasonQuali(YEAR, id));
      if (rows) { c = { races: c.races + rows.length, wins: c.wins + rows.filter((r) => r.position === 1 && r.positionText === '1').length, podiums: c.podiums + rows.filter((r) => ['1', '2', '3'].includes(r.positionText)).length, poles: c.poles + (q ? q.poles : 0), fastest: c.fastest + rows.filter((r) => r.fastest).length, seasons: c.seasons + (rows.length && lo.last < YEAR ? 1 : 0), first: c.first } ; }
    }
    return { ...c, points: undefined };
  }
  const scope = `/drivers/${id}`;
  const cnt = (kind, pos) => settle(get(`${scope}/${kind}${pos ? `/${pos}` : ''}.json?limit=1`, DAY).then((d) => Number(d.total)));
  const seasonsP = settle(get(`${scope}/seasons.json?limit=100`, DAY).then((d) => d.SeasonTable.Seasons.map((x) => Number(x.season))));
  const [races, w, p2, p3, poles, fastest, seasons] = await Promise.all([cnt('results'), cnt('results', 1), cnt('results', 2), cnt('results', 3), cnt('qualifying', 1), settle(total(`${scope}/fastest/1/results.json`)), seasonsP]);
  // The position filter is checked, not trusted: if it was ignored the filtered total equals the unfiltered one.
  const ok = races != null && w != null && (races === 0 || w < races) ? { w, podiums: p2 != null && p3 != null ? w + p2 + p3 : null } : null;
  return {
    races, wins: ok ? ok.w : null, podiums: ok ? ok.podiums : null, poles: poles != null && (races == null || poles <= races) ? poles : null, fastest,
    seasons: seasons ? seasons.length : null, first: seasons ? Math.min(...seasons) : null, points: undefined,
  };
}
// Total career points (all results plus sprints): the slow part of a career, loaded on its own.
export async function driverPoints(id) {
  const lo = LH.localCareer(id);
  if (lo) {
    let extra = 0;
    if (await racingNow(id)) {
      const [rows, spr] = await Promise.all([settle(driverSeasonResults(YEAR, id)), settle(pageAll(`/${YEAR}/drivers/${id}/sprint.json`, sprintRows, 10 * MIN, 1))]);
      extra = (rows ? rows.reduce((a, r) => a + r.points, 0) : 0) + (spr ? sumPts(spr) : 0);
    }
    return Math.round((lo.points + extra) * 10) / 10;
  }
  const scope = `/drivers/${id}`;
  const [rows, sprint] = await Promise.all([settle(pageAll(`${scope}/results.json`, resultRows, DAY, 10)), settle(pageAll(`${scope}/sprint.json`, sprintRows, DAY, 3))]);
  return rows && sprint ? Math.round((sumPts(rows) + sumPts(sprint)) * 10) / 10 : null;
}
// Team totals. A figure the server cannot give is null and shown as a dash, never a guess.
export async function constructorCareer(id, year) {
  const lo = LH.localTeamCareer(id);
  if (lo) {
    const cur = await settle(constructorSeason(YEAR, id));
    return { wins: lo.wins + (cur?.wins || 0), poles: lo.poles + (cur?.poles || 0), seasons: lo.seasons + (cur && cur.races ? 1 : 0), first: lo.first };
  }
  const scope = `/constructors/${id}`;
  const winsP = settle(total(`${scope}/results.json`)).then((n) => (n == null ? null : countAt(scope, 'results', 1, n)));
  const polesP = settle(total(`${scope}/qualifying.json`)).then((n) => (n == null ? null : countAt(scope, 'qualifying', 1, n)));
  const seasonsP = settle(get(`${scope}/seasons.json?limit=100`, DAY).then((d) => d.SeasonTable.Seasons.map((x) => Number(x.season))));
  const [wins, poles, seasonList] = await Promise.all([winsP, polesP, seasonsP]);
  return {
    wins, poles, seasons: seasonList ? seasonList.length : null, first: seasonList ? Math.min(...seasonList) : null,
  };
}
// Seasons a team entered, newest first.
export async function constructorSeasonsList(id) {
  const lo = LH.localTeamSeasons(id);
  if (lo) { const cur = await settle(constructorSeason(YEAR, id)); return cur && cur.races ? [YEAR, ...lo.filter((y) => y !== YEAR)] : lo; }
  const d = await get(`/constructors/${id}/seasons.json?limit=100`, 7 * DAY);
  return d.SeasonTable.Seasons.map((x) => Number(x.season)).sort((a, b) => b - a);
}
export async function teamDrivers(year, id) {
  if (LH.localYear(year)) { const l = LH.localTeamDrivers(year, id); if (l && l.length) return l; }
  const d = await get(`/${year}/constructors/${id}/drivers.json`, ttlFor(year, 6 * HOUR));
  return d.DriverTable.Drivers.map((x) => (LH.learn(x.driverId, x.givenName, x.familyName), { driverId: x.driverId, name: `${x.givenName} ${x.familyName}`, first: x.givenName, last: x.familyName, number: x.permanentNumber, code: x.code }));
}

// Seasons a driver has raced in, newest first: one small request.
export async function driverSeasons(id) {
  const lo = LH.localSeasons(id);
  if (lo) { if (!lo.includes(YEAR) && (await racingNow(id))) return [YEAR, ...lo]; return lo; }
  const d = await get(`/drivers/${id}/seasons.json?limit=100`, 7 * DAY);
  return d.SeasonTable.Seasons.map((x) => Number(x.season)).sort((a, b) => b - a);
}
// Teams a driver raced for, oldest first, with the first and last season and the number of races (same pages as driverCareer, so cached).
export async function driverTeamsList(id) {
  const lo = LH.localTeamsList(id);
  if (lo) {
    if (await racingNow(id)) {
      const rows = await settle(driverSeasonResults(YEAR, id));
      if (rows && rows.length) { const t = rows.at(-1); const first = lo[0]; if (first && first.teamId === t.teamId) { first.to = YEAR; first.races += rows.length; } else lo.unshift({ teamId: t.teamId, name: t.team, from: YEAR, to: YEAR, races: rows.length }); }
    }
    return lo;
  }
  const rows = await pageAll(`/drivers/${id}/results.json`, resultRows, DAY, 10);
  const out = [];
  [...rows].sort((a, b) => Number(a.race.season) - Number(b.race.season) || Number(a.race.round) - Number(b.race.round)).forEach((x) => {
    const tid = x.r.Constructor?.constructorId, y = Number(x.race.season), last = out[out.length - 1];
    if (last && last.teamId === tid) { last.to = y; last.races++; } else out.push({ teamId: tid, name: x.r.Constructor?.name, from: y, to: y, races: 1 });
  });
  return out.reverse();
}
// The drivers who raced for each team in the latest Grand Prix: the real current line-up. Reserve drivers never appear here.
// Falls back to the standings before the first race of a season.
export async function lineups(year) {
  const out = {}; const add = (teamId, d) => { (out[teamId] = out[teamId] || []).push({ ...d, teamId }); };
  const lr = await lastRace(year).catch(() => null);
  if (lr && lr.rows.length) lr.rows.forEach((r) => add(r.teamId, { driverId: r.driverId, name: r.driver, first: r.first, last: r.last, code: r.code, team: r.team }));
  else (await driverStandings(year)).forEach((x) => add(x.teamId, { driverId: x.driverId, name: x.name, first: x.first, last: x.last, code: x.code, team: x.team }));
  // Only the two race seats: test, reserve and one-off drivers are left out (the ones with the most points keep the seats).
  const st = await driverStandings(year).catch(() => []); const pts = (id) => st.find((x) => x.driverId === id)?.points ?? -1;
  // Seat changes the results feed has not caught up with (a one-off stand-in shows up where the full-time driver now sits).
  Object.keys(out).forEach((k) => { out[k] = out[k].map((d) => (/hirakawa/i.test(d.last || d.name || '') ? { ...d, driverId: 'rafael_camara', name: 'Rafael Câmara', first: 'Rafael', last: 'Câmara', code: 'CAM' } : d)); });
  Object.keys(out).forEach((k) => { if (out[k].length > 2) out[k] = [...out[k]].sort((a, b) => pts(b.driverId) - pts(a.driverId)).slice(0, 2); });
  return out;
}
// One team's season so far, from both cars' results. A figure that fails to load is null and shows as a dash.
export async function constructorSeason(year, id) {
  if (LH.localYear(year)) { const l = LH.localTeamSeason(year, id); if (l) return l; }
  const scope = `/${year}/constructors/${id}`;
  const [rows, quali] = await Promise.all([settle(pageAll(`${scope}/results.json`, resultRows, ttlFor(year, 10 * MIN), 3)), settle(pageAll(`${scope}/qualifying.json`, qualiRows, ttlFor(year, 30 * MIN), 2))]);
  const ok = (x) => !Number.isNaN(Number(x.r.positionText));
  const rounds = rows ? [...new Set(rows.map((x) => x.race.round))] : null;
  return {
    races: rounds ? rounds.length : null,
    wins: rows ? rows.filter((x) => x.r.position === '1').length : null,
    podiums: rows ? rows.filter((x) => Number(x.r.position) <= 3 && ok(x)).length : null,
    fastest: rows ? rows.filter((x) => x.r.FastestLap?.rank === '1').length : null,
    doubles: rows ? rounds.filter((rd) => { const p = rows.filter((x) => x.race.round === rd).map((x) => x.r.position); return p.includes('1') && p.includes('2'); }).length : null,
    dnf: rows ? rows.filter((x) => !ok(x)).length : null,
    poles: quali ? quali.filter((x) => x.r.position === '1').length : null,
  };
}

// Points after every round of a season (race plus sprint points), per driver and per team, for the season chart.
export async function seasonPoints(year) {
  if (LH.localYear(year)) { const l = LH.localSeasonPoints(year); if (l) return l; }
  const [res, spr] = await Promise.all([pageAll(`/${year}/results.json`, resultRows, ttlFor(year, HOUR), 6), settle(pageAll(`/${year}/sprint.json`, sprintRows, ttlFor(year, HOUR), 3))]);
  const rows = [...res, ...(spr || [])];
  const names = {}; res.forEach((x) => { names[Number(x.race.round)] = x.race.raceName; });
  const rounds = [...new Set(rows.map((x) => Number(x.race.round)))].sort((a, b) => a - b);
  const drv = {}, team = {};
  rows.forEach((x) => {
    const d = x.r.Driver, c = x.r.Constructor, rd = Number(x.race.round), pts = Number(x.r.points || 0);
    const a = drv[d.driverId] || (drv[d.driverId] = { driverId: d.driverId, first: d.givenName, last: d.familyName, by: {} });
    a.teamId = c.constructorId; a.by[rd] = (a.by[rd] || 0) + pts;
    const t = team[c.constructorId] || (team[c.constructorId] = { teamId: c.constructorId, name: c.name, by: {} });
    t.by[rd] = (t.by[rd] || 0) + pts;
  });
  const cum = (by) => { let t = 0; return rounds.map((r) => (t += by[r] || 0)); };
  const fin = (list) => list.map((o) => ({ ...o, pts: cum(o.by) })).sort((a, b) => b.pts[b.pts.length - 1] - a.pts[a.pts.length - 1]);
  return { rounds: rounds.map((r) => ({ round: r, name: names[r] || '' })), drivers: fin(Object.values(drv)), teams: fin(Object.values(team)) };
}

// The entry list for a season (before it starts: whatever the server has published so far). Teams with their drivers.
export async function entryList(year) {
  if (year === 2027) { // announced line-ups are the fallback until the data server lists a full 2027 entry
    try { const live = await entryListLive(year); if (live.length >= 10 && live.every((t) => t.drivers.length >= 2)) return live; } catch {}
    return GRID_2027;
  }
  return entryListLive(year);
}
async function entryListLive(year) {
  const cs = (await get(`/${year}/constructors.json?limit=100`, 10 * MIN)).ConstructorTable.Constructors;
  const out = await Promise.all(cs.map(async (c) => ({ teamId: c.constructorId, name: c.name, drivers: await settle(teamDrivers(year, c.constructorId)) || [] })));
  return out.filter((x) => x.drivers.length);
}

// Everyone who ever raced / every team that ever entered (for search). Big lists, so they are kept for a month.
export async function allDrivers() {
  // Everyone who raced up to last season comes from the built-in history (instant); newcomers of the live season are added from the standings.
  try {
    await driverStandings(YEAR).catch(() => []);
    const base = LH.localAllDrivers().map(({ last_year, first_year, ...x }) => x);
    const have = new Set(base.map((x) => x.driverId));
    const extra = (await driverStandings(YEAR).catch(() => [])).filter((x) => !have.has(x.driverId)).map((x) => ({ driverId: x.driverId, name: x.name, first: x.first, last: x.last, code: x.code, number: x.permNumber, nationality: '', dob: null }));
    return [...base, ...extra];
  } catch {}
  const q = (o) => `/drivers.json?limit=100&offset=${o}`;
  const first = await get(q(0), 30 * DAY); const pages = Math.ceil(Number(first.total) / 100);
  // The other pages load side by side; a page that fails is skipped (and tried again next time) instead of losing the whole list.
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => get(q((i + 1) * 100), 30 * DAY).catch(() => null)));
  const rows = [first, ...rest].filter(Boolean).flatMap((d) => d.DriverTable.Drivers);
  return rows.map((d) => ({ driverId: d.driverId, name: `${d.givenName} ${d.familyName}`, first: d.givenName, last: d.familyName, code: d.code, number: d.permanentNumber, nationality: d.nationality, dob: d.dateOfBirth }));
}
export async function allConstructors() {
  try {
    const base = LH.localAllTeams(); const have = new Set(base.map((x) => x.teamId));
    const cur = await constructorStandings(YEAR).catch(() => []);
    return [...base, ...cur.filter((x) => !have.has(x.teamId)).map((x) => ({ teamId: x.teamId, name: x.name, nationality: '' }))];
  } catch {}
  const rows = await pageAll('/constructors.json', (d) => d.ConstructorTable.Constructors, 30 * DAY, 6);
  return rows.map((c) => ({ teamId: c.constructorId, name: c.name, nationality: c.nationality }));
}

// Every result line of a season with its status text (for the reliability report). Past seasons come from the offline history.
export async function seasonStatuses(year) {
  if (LH.localYear(year)) { const l = LH.localSeasonStatuses(year); if (l) return l; }
  const rows = await pageAll(`/${year}/results.json`, resultRows, ttlFor(year, HOUR), 6);
  return rows.map(({ race, r }) => ({ round: Number(race.round), race: race.raceName, teamId: r.Constructor.constructorId, team: r.Constructor.name, driverId: r.Driver.driverId, last: r.Driver.familyName, status: r.status || '', finished: /^(Finished|\+\d+ Laps?)$/i.test(r.status || '') }));
}

// Qualifying position and race grid slot for every driver in a season (for the grid-drops tracker). Online only, qualifying is not in the offline history.
export async function gridData(year) {
  const qp = pageAll(`/${year}/qualifying.json`, qualiRows, ttlFor(year, HOUR), 6); const rp = pageAll(`/${year}/results.json`, resultRows, ttlFor(year, HOUR), 6);
  const [qr, rr] = await Promise.all([qp, rp]);
  return {
    quali: qr.map(({ race, r }) => ({ round: Number(race.round), driverId: r.Driver.driverId, first: r.Driver.givenName, last: r.Driver.familyName, team: r.Constructor.name, teamId: r.Constructor.constructorId, pos: Number(r.position) })),
    results: rr.map(({ race, r }) => ({ round: Number(race.round), race: race.raceName, driverId: r.Driver.driverId, grid: Number(r.grid) })),
  };
}

// Lap by lap running order of one race. Jolpica lists every lap time with the position held, 100 rows a page, so a race takes about a dozen pages.
// Returns { laps, cars: [{ id, code, name, teamId, grid, finish, pos: [position after lap 1, 2, ...] }] }. Positions before a car's first or after its last lap are null.
export async function raceLaps(year, round) {
  const res = await sessionResults(year, round, 'results'); if (!res || !res.length) return null;
  const rows = await pageAll(`/${year}/${round}/laps.json`, (d) => (d.RaceTable.Races[0] ? d.RaceTable.Races[0].Laps : []), ttlFor(year, HOUR), 20);
  const by = {}; let n = 0;
  rows.forEach((l) => { const k = Number(l.number); n = Math.max(n, k); (by[k] = by[k] || []).push(...l.Timings); });
  if (!n) return null;
  const cars = res.map((r) => ({ id: r.driverId, code: r.code || (r.last || '').slice(0, 3).toUpperCase(), name: r.driver, teamId: r.teamId, grid: r.grid > 0 ? r.grid : res.length, finish: r.position, status: r.status, pos: Array(n).fill(null) }));
  const idx = Object.fromEntries(cars.map((c, i) => [c.id, i]));
  Object.keys(by).forEach((k) => by[k].forEach((t) => { const i = idx[t.driverId]; if (i !== undefined) cars[i].pos[Number(k) - 1] = Number(t.position); }));
  return { laps: n, cars };
}

// Team-mate battles for a season: for every team, the two drivers who raced most for it, and who was ahead in qualifying and in the race at each round.
// Rounds where either driver did not take part in a session are left out of that session's count. Qualifying comes from Jolpica (not in the offline history).
export async function teamBattles(year) {
  let per = null;
  if (LH.localYear(year)) per = LH.localBattles(year); // finished seasons: instant, from the built-in history
  if (!per) {
    // the live season: two paged requests (results and qualifying for the whole year) instead of two per round
    const [res, qual] = await Promise.all([pageAll(`/${year}/results.json`, resultRows, ttlFor(year, 20 * MIN), 8), pageAll(`/${year}/qualifying.json`, qualiRows, ttlFor(year, 20 * MIN), 8).catch(() => [])]);
    const rounds = {};
    const row = ({ race, r }, isQ) => { const o = (rounds[race.round] ||= { round: Number(race.round), name: race.raceName, x: [], q: [] }); (isQ ? o.q : o.x).push({ driverId: r.Driver.driverId, driver: `${r.Driver.givenName} ${r.Driver.familyName}`, last: r.Driver.familyName, teamId: r.Constructor.constructorId, team: r.Constructor.name, position: Number(r.position) || 99 }); };
    res.forEach((e) => row(e, false)); qual.forEach((e) => row(e, true));
    per = Object.values(rounds).sort((a, b) => a.round - b.round);
  }
  const teams = {};
  per.forEach((p) => (p.x || []).forEach((r) => { const t = (teams[r.teamId] ||= { teamId: r.teamId, name: r.team, n: {} }); t.n[r.driverId] = t.n[r.driverId] || { id: r.driverId, name: r.driver, last: r.last, n: 0 }; t.n[r.driverId].n++; }));
  const out = Object.values(teams).map((t) => {
    const [a, b] = Object.values(t.n).sort((m, n) => n.n - m.n).slice(0, 2); if (!a || !b) return null;
    const cmp = (list, key) => per.map((p) => { const rows = p[list]; if (!rows) return 0; const ra = rows.find((r) => r.driverId === a.id), rb = rows.find((r) => r.driverId === b.id); if (!ra || !rb) return 0; const pa = Number(ra[key]), pb = Number(rb[key]); if (!(pa > 0) || !(pb > 0) || pa === pb) return 0; return pa < pb ? 1 : -1; });
    const q = cmp('q', 'position'), r = cmp('x', 'position'); const sum = (l, v) => l.filter((x) => x === v).length;
    return { teamId: t.teamId, name: t.name, a, b, q, r, qa: sum(q, 1), qb: sum(q, -1), ra: sum(r, 1), rb: sum(r, -1) };
  }).filter(Boolean).sort((m, n) => (n.qa + n.qb + n.ra + n.rb) - (m.qa + m.qb + m.ra + m.rb) || m.name.localeCompare(n.name));
  return { rounds: per.map((p) => ({ round: p.round, name: p.name })), teams: out };
}

// Career numbers since drivers were allowed to pick one: number -> drivers who registered it (Jolpica lists a permanent number for each driver that had one).
export async function numberBoard() {
  const rows = await pageAll('/drivers.json', (d) => d.DriverTable.Drivers, 30 * DAY, 12); const by = {};
  rows.forEach((d) => { const n = Number(d.permanentNumber); if (!(n > 0)) return; (by[n] ||= []).push({ id: d.driverId, name: `${d.givenName} ${d.familyName}`, last: d.familyName, nat: d.nationality, code: d.code }); });
  return by;
}
// Sprint results of one season (2021 on) with the winner of each Grand Prix, summarised per weekend and per driver.
export async function sprintSeason(year) {
  const [spr, win] = await Promise.all([pageAll(`/${year}/sprint.json`, sprintRows, ttlFor(year, 30 * MIN), 4), pageAll(`/${year}/results/1.json`, resultRows, ttlFor(year, 30 * MIN), 2).catch(() => [])]);
  const raceWin = {}; win.forEach((x) => { raceWin[x.race.round] = { id: x.r.Driver.driverId, name: `${x.r.Driver.givenName} ${x.r.Driver.familyName}` }; });
  const wk = {}, dr = {};
  spr.forEach(({ race, r }) => {
    const w = (wk[race.round] ||= { year, round: Number(race.round), name: race.raceName.replace(' Grand Prix', ''), date: race.date, win: null, raceWin: raceWin[race.round] || null });
    const id = r.Driver.driverId; const pos = Number(r.position), grid = Number(r.grid);
    const d = (dr[id] ||= { id, name: `${r.Driver.givenName} ${r.Driver.familyName}`, last: r.Driver.familyName, teamId: r.Constructor.constructorId, n: 0, wins: 0, podiums: 0, pts: 0, gain: 0, gainN: 0 });
    d.n++; d.pts += Number(r.points) || 0; d.teamId = r.Constructor.constructorId; if (pos === 1) { d.wins++; w.win = { id, name: d.name }; } if (pos >= 1 && pos <= 3) d.podiums++;
    if (pos > 0 && grid > 0) { d.gain += grid - pos; d.gainN++; }
  });
  return { weekends: Object.values(wk).sort((a, b) => a.round - b.round), drivers: Object.values(dr) };
}
export async function sprintAll(fromYear, toYear) {
  const years = []; for (let y = fromYear; y <= toYear; y++) years.push(y);
  const per = await Promise.all(years.map((y) => sprintSeason(y).catch(() => ({ weekends: [], drivers: [] }))));
  const dr = {}; per.forEach((p) => p.drivers.forEach((d) => { const o = (dr[d.id] ||= { ...d, n: 0, wins: 0, podiums: 0, pts: 0, gain: 0, gainN: 0 }); o.n += d.n; o.wins += d.wins; o.podiums += d.podiums; o.pts += d.pts; o.gain += d.gain; o.gainN += d.gainN; o.teamId = d.teamId; }));
  return { weekends: per.flatMap((p) => p.weekends), drivers: Object.values(dr) };
}
