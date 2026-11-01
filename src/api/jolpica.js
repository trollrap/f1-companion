// Jolpica-F1: Ergast-compatible history, results and standings. No live timing.
// Routes follow Jolpica's docs: season first, then /drivers/{id}, /constructors/{id}, /fastest/{rank}, endpoints end in .json or /.
// The position filter (/results/1) is NOT in Jolpica's docs, so it is probed at runtime and falls back to counting rows.
import { cachedJSON, memo, MIN, HOUR, DAY } from '../lib/cache';
import { YEAR } from './openf1';
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
const resultRows = (d) => d.RaceTable.Races.flatMap((race) => race.Results.map((r) => ({ race, r })));
const qualiRows = (d) => d.RaceTable.Races.flatMap((race) => race.QualifyingResults.map((r) => ({ race, r })));

const mapRow = (r) => ({
  position: Number(r.position), positionText: r.positionText, driver: `${r.Driver.givenName} ${r.Driver.familyName}`, first: r.Driver.givenName, last: r.Driver.familyName, code: r.Driver.code,
  driverId: r.Driver.driverId, team: r.Constructor?.name, teamId: r.Constructor?.constructorId, grid: Number(r.grid),
  time: r.Time?.time ?? r.status, points: Number(r.points), fastest: r.FastestLap?.rank === '1', status: r.status,
});
export async function lastRace(year) {
  const d = await get(`/${year}/last/results.json`, ttlFor(year, 10 * MIN));
  const race = d.RaceTable.Races[0];
  return race && { round: Number(race.round), date: race.date, name: race.raceName, rows: race.Results.map(mapRow) };
}
export async function sessionResults(year, round, kind /* results | qualifying | sprint */) {
  const d = await get(`/${year}/${round}/${kind}.json`, ttlFor(year, 30 * MIN));
  const race = d.RaceTable.Races[0];
  if (!race) return null;
  if (kind === 'qualifying') return race.QualifyingResults.map((r) => ({
    position: Number(r.position), driver: `${r.Driver.givenName} ${r.Driver.familyName}`, first: r.Driver.givenName, last: r.Driver.familyName, driverId: r.Driver.driverId, team: r.Constructor.name, teamId: r.Constructor.constructorId, q1: r.Q1, q2: r.Q2, q3: r.Q3 }));
  return (race.SprintResults || race.Results).map(mapRow);
}
export async function driverStandings(year) {
  const d = await get(`/${year}/driverstandings.json`, ttlFor(year, 10 * MIN));
  const list = d.StandingsTable.StandingsLists[0];
  return Object.assign((list?.DriverStandings || []).map((s) => ({
    position: Number(s.position), points: Number(s.points), wins: Number(s.wins), driverId: s.Driver.driverId,
    name: `${s.Driver.givenName} ${s.Driver.familyName}`, first: s.Driver.givenName, last: s.Driver.familyName, code: s.Driver.code, permNumber: s.Driver.permanentNumber, teamId: s.Constructors?.at(-1)?.constructorId, team: s.Constructors?.at(-1)?.name })), { round: Number(list?.round) });
}
export async function constructorStandings(year) {
  const d = await get(`/${year}/constructorstandings.json`, ttlFor(year, 10 * MIN));
  const list = d.StandingsTable.StandingsLists[0];
  return Object.assign((list?.ConstructorStandings || []).map((s) => ({
    position: Number(s.position), points: Number(s.points), wins: Number(s.wins), teamId: s.Constructor.constructorId, name: s.Constructor.name })), { round: Number(list?.round) });
}
// Winner per round: { round: { last, teamId, team } }. Uses the position filter when the server honours it, otherwise reads the full results.
export async function winnersByRound(year) {
  let races = null;
  try {
    const d = await get(`/${year}/results/1.json?limit=100`, ttlFor(year, HOUR));
    if (d.RaceTable.Races.every((r) => r.Results.length === 1 && r.Results[0].position === '1')) races = d.RaceTable.Races.map((r) => ({ round: r.round, r: r.Results[0] }));
  } catch {}
  if (!races) races = (await pageAll(`/${year}/results.json`, resultRows, ttlFor(year, HOUR))).filter((x) => x.r.position === '1').map((x) => ({ round: x.race.round, r: x.r }));
  const out = {}; races.forEach((x) => { out[Number(x.round)] = { last: x.r.Driver.familyName, teamId: x.r.Constructor?.constructorId, team: x.r.Constructor?.name }; });
  return out;
}
// The full schedule with every session start (UTC). Used for round numbers, sprint weekends and as a fallback for OpenF1.
export async function jolpicaSchedule(year) {
  const d = await get(`/${year}/races.json?limit=100`, ttlFor(year, 6 * HOUR));
  return d.RaceTable.Races.map((r) => ({ ...r, round: Number(r.round) }));
}

/* ---------- drivers and teams ---------- */
const seasonRow = (race, r) => ({
  round: Number(race.round), race: race.raceName, country: race.Circuit?.Location?.country, date: race.date, grid: Number(r.grid), position: Number(r.position), positionText: r.positionText,
  points: Number(r.points), status: r.status, fastest: r.FastestLap?.rank === '1', teamId: r.Constructor?.constructorId, team: r.Constructor?.name,
});
export async function driverInfo(id) {
  const d = (await get(`/drivers/${id}.json`, 7 * 24 * HOUR)).DriverTable.Drivers[0];
  return d && { id: d.driverId, name: `${d.givenName} ${d.familyName}`, number: d.permanentNumber, code: d.code, born: d.dateOfBirth, nationality: d.nationality, url: d.url };
}
export async function constructorInfo(id) {
  const c = (await get(`/constructors/${id}.json`, 7 * 24 * HOUR)).ConstructorTable.Constructors[0];
  return c && { id: c.constructorId, name: c.name, nationality: c.nationality, url: c.url };
}
export async function driverSeasonResults(year, id) {
  const d = await get(`/${year}/drivers/${id}/results.json?limit=100`, ttlFor(year, 10 * MIN));
  return d.RaceTable.Races.map((race) => seasonRow(race, race.Results[0]));
}
export async function driverSeasonQuali(year, id) {
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

// World champions by season. One call when the server supports the position filter on standings, otherwise one call per past season.
// Uses only the current-season-free years, so a title in progress is never counted.
export function champions(kind /* driver | constructor */, year) {
  const route = kind === 'driver' ? 'driverstandings' : 'constructorstandings', first = kind === 'driver' ? 1950 : 1958;
  const pick = (l) => (kind === 'driver' ? l.DriverStandings?.find((x) => x.position === '1')?.Driver.driverId : l.ConstructorStandings?.find((x) => x.position === '1')?.Constructor.constructorId);
  return memo(`champions:${kind}:${year}`, 7 * DAY, async () => {
    try {
      const lists = (await get(`/${route}/1.json?limit=100`, 7 * DAY)).StandingsTable.StandingsLists;
      const out = lists.filter((l) => Number(l.season) < year).map((l) => ({ season: Number(l.season), id: pick(l) }));
      if (out.length >= year - first - 3 && out.every((x) => x.id)) return out; // looks complete
    } catch {}
    const out = [];
    for (let y = first; y < year; y++) { const l = (await get(`/${y}/${route}.json`, 90 * DAY)).StandingsTable.StandingsLists[0]; if (l) out.push({ season: y, id: pick(l) }); }
    return out;
  });
}

export async function driverCareer(id, year) {
  const scope = `/drivers/${id}`;
  // All the pieces start at once; the throttle in cache.js spaces the requests.
  const polesP = (async () => {
    const qAll = await settle(total(`${scope}/qualifying.json`));
    if (qAll == null) return null;
    const p = await countAt(scope, 'qualifying', 1, qAll);
    return p !== null ? p : settle(pageAll(`${scope}/qualifying.json`, qualiRows, DAY, 10).then((r) => r.filter((x) => x.r.position === '1').length));
  })();
  const [rows, fastest, sprint, poles] = await Promise.all([settle(pageAll(`${scope}/results.json`, resultRows, DAY, 10)), settle(total(`${scope}/fastest/1/results.json`)), settle(pageAll(`${scope}/sprint.json`, sprintRows, DAY, 3)), polesP]);
  const at = (n) => (rows ? rows.filter((x) => x.r.position === String(n)).length : null);
  const seasons = rows ? [...new Set(rows.map((x) => Number(x.race.season)))].sort((a, b) => a - b) : null;
  return {
    races: rows ? rows.length : null, wins: at(1), podiums: rows ? at(1) + at(2) + at(3) : null, poles, fastest,
    seasons: seasons ? seasons.length : null, first: seasons ? seasons[0] : null,
    points: rows && sprint ? Math.round((sumPts(rows) + sumPts(sprint)) * 10) / 10 : null,
  };
}
// Titles load separately (they can need many requests the first time) so the rest of the career appears right away.
export async function driverTitles(id, year) { const c = await settle(champions('driver', year)); return c ? c.filter((x) => x.id === id).length : null; }
export async function constructorTitles(id, year) { const c = await settle(champions('constructor', year)); return c ? c.filter((x) => x.id === id).length : null; }
// Team totals. A figure the server cannot give is null and shown as a dash, never a guess.
export async function constructorCareer(id, year) {
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
  const d = await get(`/constructors/${id}/seasons.json?limit=100`, 7 * DAY);
  return d.SeasonTable.Seasons.map((x) => Number(x.season)).sort((a, b) => b - a);
}
export async function teamDrivers(year, id) {
  const d = await get(`/${year}/constructors/${id}/drivers.json`, ttlFor(year, 6 * HOUR));
  return d.DriverTable.Drivers.map((x) => ({ driverId: x.driverId, name: `${x.givenName} ${x.familyName}`, first: x.givenName, last: x.familyName, number: x.permanentNumber, code: x.code }));
}

// Seasons a driver has raced in, newest first. Reads the same pages as driverCareer, so it comes from the cache.
export async function driverSeasons(id) {
  const rows = await pageAll(`/drivers/${id}/results.json`, resultRows, DAY, 10);
  return [...new Set(rows.map((x) => Number(x.race.season)))].sort((a, b) => b - a);
}
// The drivers who raced for each team in the latest Grand Prix: the real current line-up. Reserve drivers never appear here.
// Falls back to the standings before the first race of a season.
export async function lineups(year) {
  const out = {}; const add = (teamId, d) => { (out[teamId] = out[teamId] || []).push({ ...d, teamId }); };
  const lr = await lastRace(year).catch(() => null);
  if (lr && lr.rows.length) lr.rows.forEach((r) => add(r.teamId, { driverId: r.driverId, name: r.driver, first: r.first, last: r.last, code: r.code, team: r.team }));
  else (await driverStandings(year)).forEach((x) => add(x.teamId, { driverId: x.driverId, name: x.name, first: x.first, last: x.last, code: x.code, team: x.team }));
  return out;
}
// One team's season so far, from both cars' results. A figure that fails to load is null and shows as a dash.
export async function constructorSeason(year, id) {
  const scope = `/${year}/constructors/${id}`;
  const rows = await settle(pageAll(`${scope}/results.json`, resultRows, ttlFor(year, 10 * MIN), 3));
  const quali = await settle(pageAll(`${scope}/qualifying.json`, qualiRows, ttlFor(year, 30 * MIN), 2));
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
  const cs = (await get(`/${year}/constructors.json?limit=100`, 10 * MIN)).ConstructorTable.Constructors;
  const out = await Promise.all(cs.map(async (c) => ({ teamId: c.constructorId, name: c.name, drivers: await settle(teamDrivers(year, c.constructorId)) || [] })));
  return out.filter((x) => x.drivers.length);
}
