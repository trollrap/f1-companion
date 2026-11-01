// "Check data sources": calls every endpoint the app depends on (uncached) and validates the response shape.
// Each result is { name, ok, detail, ms }. Nothing here changes app data.
import { liveJSON } from './cache';
const OF = 'https://api.openf1.org/v1', JP = 'https://api.jolpi.ca/ergast/f1';
const Y = 2026;
const mr = (r) => r.json?.MRData;
async function step(name, fn) {
  const t0 = Date.now();
  try { const detail = await fn(); return { name, ok: true, detail, ms: Date.now() - t0 }; }
  catch (e) { return { name, ok: false, detail: String(e.message || e), ms: Date.now() - t0 }; }
}
const need = (r, label) => { if (r.status !== 200) throw new Error(`${label}: HTTP ${r.status}${r.status === 401 || r.status === 403 ? ' (OpenF1 may block free requests while a session is live)' : r.status === 429 ? ' (rate limited, try again in a minute)' : ''}`); return r; };

export async function runDiagnostics(onResult) {
  const out = []; const push = (r) => { out.push(r); onResult?.(r); return r; };
  let raceSession = null;
  push(await step('OpenF1 meetings', async () => {
    const r = need(await liveJSON(`${OF}/meetings?year=${Y}`), 'meetings'); const m = r.json;
    if (!Array.isArray(m) || !m.length) throw new Error('empty list');
    if (!('gmt_offset' in m[0]) || !('date_start' in m[0])) throw new Error('fields gmt_offset/date_start missing');
    return `${m.length} meetings, gmt_offset ${m[0].gmt_offset}`;
  }));
  push(await step('OpenF1 sessions', async () => {
    const r = need(await liveJSON(`${OF}/sessions?year=${Y}&session_name=Race`), 'sessions'); const s = r.json;
    if (!Array.isArray(s) || !s.length) throw new Error('empty list');
    raceSession = [...s].filter((x) => Date.parse(x.date_end) < Date.now()).sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start))[0] || null;
    return `${s.length} race sessions`;
  }));
  push(await step('OpenF1 session results', async () => {
    if (!raceSession) throw new Error('no finished race to test with');
    const r = need(await liveJSON(`${OF}/session_result?session_key=${raceSession.session_key}`), 'session_result'); const x = r.json;
    if (!Array.isArray(x) || !x.length || !('position' in x[0])) throw new Error('unexpected shape');
    return `${x.length} rows for session ${raceSession.session_key}`;
  }));
  push(await step('OpenF1 track outline', async () => {
    if (!raceSession) throw new Error('no finished race to test with');
    const laps = need(await liveJSON(`${OF}/laps?session_key=${raceSession.session_key}&lap_number=3`), 'laps').json;
    const lap = laps?.find?.((l) => l.lap_duration && l.date_start && !l.is_pit_out_lap); if (!lap) throw new Error('no clean lap found');
    const end = new Date(Date.parse(lap.date_start) + lap.lap_duration * 1000).toISOString();
    const loc = need(await liveJSON(`${OF}/location?session_key=${raceSession.session_key}&driver_number=${lap.driver_number}&date%3E=${lap.date_start}&date%3C=${end}`), 'location').json;
    if (!Array.isArray(loc) || loc.length < 100) throw new Error(`only ${loc?.length ?? 0} points`);
    return `${loc.length} location points in one lap`;
  }));
  push(await step('Jolpica schedule', async () => {
    const d = mr(need(await liveJSON(`${JP}/${Y}/races.json?limit=100`), 'races')); const races = d?.RaceTable?.Races;
    if (!races?.length || !races[0].FirstPractice) throw new Error('no races or sessions');
    return `${races.length} races with session times`;
  }));
  push(await step('Jolpica driver standings', async () => {
    const d = mr(need(await liveJSON(`${JP}/${Y}/driverstandings.json`), 'standings')); const l = d?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;
    if (!l?.length) throw new Error('empty table'); return `${l.length} drivers, leader ${l[0].Driver.familyName} ${l[0].points} pts`;
  }));
  push(await step('Jolpica team standings', async () => {
    const d = mr(need(await liveJSON(`${JP}/${Y}/constructorstandings.json`), 'standings')); const l = d?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings;
    if (!l?.length) throw new Error('empty table'); return `${l.length} teams`;
  }));
  push(await step('Jolpica last race result', async () => {
    const d = mr(need(await liveJSON(`${JP}/${Y}/last/results.json`), 'results')); const race = d?.RaceTable?.Races?.[0];
    if (!race?.Results?.length) throw new Error('no result'); return `${race.raceName}: ${race.Results.length} rows`;
  }));
  push(await step('Jolpica qualifying', async () => {
    const d = mr(need(await liveJSON(`${JP}/${Y}/last/qualifying.json`), 'qualifying')); const race = d?.RaceTable?.Races?.[0];
    if (!race?.QualifyingResults?.length) throw new Error('no result'); return `${race.raceName}: ${race.QualifyingResults.length} rows`;
  }));
  push(await step('Jolpica career counts', async () => {
    const all = Number(mr(need(await liveJSON(`${JP}/drivers/max_verstappen/results.json?limit=1`), 'results')).total);
    const fastest = Number(mr(need(await liveJSON(`${JP}/drivers/max_verstappen/fastest/1/results.json?limit=1`), 'fastest')).total);
    const wins = Number(mr(need(await liveJSON(`${JP}/drivers/max_verstappen/results/1.json?limit=1`), 'wins')).total);
    const honoured = wins < all;
    return `${all} races, ${fastest} fastest laps, position filter ${honoured ? 'works' : 'ignored (app counts rows instead)'}`;
  }));
  const probe = async (path) => { const r = await liveJSON(`${JP}${path}`); return { path, status: r.status, mr: r.json?.MRData }; };
  const describe = (list) => list.map((x) => `${x.path.split('.json')[0].split('/').slice(-2).join('/')} ${x.status}`).join(', ');
  push(await step('Jolpica driver history', async () => {
    const r = [await probe('/drivers/max_verstappen/results.json?limit=100&offset=100'), await probe('/drivers/max_verstappen/sprint.json?limit=100'), await probe('/drivers/max_verstappen/qualifying/1.json?limit=1')];
    const bad = r.filter((x) => x.status !== 200); if (bad.length) throw new Error(`failed: ${describe(bad)}`);
    return `paging, sprints and pole filter work (${r[1].mr.total} sprint results, ${r[2].mr.total} poles)`;
  }));
  push(await step('Jolpica champions list', async () => {
    const r = await probe('/driverstandings/1.json?limit=100'); if (r.status !== 200) throw new Error(`HTTP ${r.status} (the app will fall back to one request per season, slower but works)`);
    const n = r.mr.StandingsTable.StandingsLists.length; if (n < 50) throw new Error(`only ${n} seasons returned (fallback will be used)`);
    return `${n} champion seasons in one request`;
  }));
  push(await step('Jolpica team history', async () => {
    const r = [await probe('/constructors/ferrari/seasons.json?limit=100'), await probe('/constructors/ferrari/results/1.json?limit=1'), await probe('/constructors/ferrari/qualifying/1.json?limit=1')];
    const bad = r.filter((x) => x.status !== 200); if (bad.length) throw new Error(`failed: ${describe(bad)}`);
    const titles = await probe('/constructorstandings/1.json?limit=100');
    return `${r[0].mr.total} Ferrari seasons, ${r[1].mr.total} wins, ${r[2].mr.total} poles. Titles: ${titles.status === 200 ? 'one request' : `HTTP ${titles.status}, the app counts one season at a time (slower the first time, then cached)`}`;
  }));
  push(await step('OpenF1 numbers and colours', async () => {
    const x = need(await liveJSON(`${OF}/drivers?session_key=latest`), 'drivers').json;
    if (!Array.isArray(x) || !x.length || !('team_colour' in x[0])) throw new Error('unexpected shape');
    return `${x.length} drivers with numbers and team colours`;
  }));
  return out;
}
