// MotoGP data from the public timing service that motogp.com itself uses (not an official, documented API: it can change without notice).
// Flow: seasons -> events -> categories -> sessions -> classification; standings: season + category.
// Every mapper reads fields defensively: a missing field becomes a dash, never a crash or an invented value.
import { cachedJSON, MIN, HOUR, DAY } from '../lib/cache';
export const MG = 'https://api.motogp.pulselive.com/motogp/v1';
const get = (path, ttl) => cachedJSON(`${MG}${path}`, ttl);
const arr = (x) => (Array.isArray(x) ? x : Array.isArray(x?.classification) ? x.classification : []);
const clean = (s) => String(s || '').replace(/[™®]/g, '').trim();

export async function seasons() {
  const l = arr(await get('/results/seasons', DAY));
  return l.map((s) => ({ id: s.id, year: Number(s.year ?? s.name), current: !!s.current })).filter((s) => s.id && s.year).sort((a, b) => b.year - a.year);
}
export const currentSeason = async () => { const l = await seasons(); return l.find((s) => s.current) || l[0] || null; };
export async function events(seasonId, year) {
  const l = arr(await get(`/results/events?seasonUuid=${seasonId}`, year && year < new Date().getFullYear() ? 30 * DAY : 30 * MIN));
  return l.filter((e) => !e.test && !/test/i.test(`${e.kind || ''} ${e.name || ''}`)).map((e, i) => ({
    id: e.id, name: clean(e.sponsored_name || e.name), short: clean(e.name || e.short_name).replace(/\s*Grand Prix( of)?\s*/i, ' ').replace(/\s+/g, ' ').trim() || clean(e.short_name), start: e.date_start, end: e.date_end,
    country: e.country?.name || '', iso: e.country?.iso || '', circuit: e.circuit?.name || '', place: e.circuit?.place || '', status: e.status || '',
  })).filter((e) => e.id && e.start).sort((a, b) => Date.parse(a.start) - Date.parse(b.start)).map((e, i) => ({ ...e, round: i + 1 }));
}
export async function categories(seasonId) {
  const l = arr(await get(`/results/categories?seasonUuid=${seasonId}`, DAY));
  const rank = (n) => (/motogp/i.test(n) && !/moto[23]/i.test(n) ? 0 : /moto2/i.test(n) ? 1 : /moto3/i.test(n) ? 2 : 3);
  return l.map((c) => ({ id: c.id, name: clean(c.name) })).filter((c) => c.id).sort((a, b) => rank(a.name) - rank(b.name));
}
const TYPE = { RAC: 'Race', SPR: 'Sprint', Q1: 'Qualifying 1', Q2: 'Qualifying 2', FP1: 'Practice 1', FP2: 'Practice 2', PR: 'Practice', WUP: 'Warm up', NQ: 'Qualifying' };
export async function sessions(eventId, categoryId) {
  const l = arr(await get(`/results/sessions?eventUuid=${eventId}&categoryUuid=${categoryId}`, 10 * MIN));
  const order = (t) => ['FP1', 'PR', 'FP2', 'Q1', 'Q2', 'NQ', 'SPR', 'WUP', 'RAC'].indexOf(t);
  return l.map((s) => ({ id: s.id, type: s.type, name: TYPE[s.type] || s.name || s.type || 'Session', date: s.date, status: s.status || '', number: s.number }))
    .filter((s) => s.id).sort((a, b) => (order(a.type) - order(b.type)) || (Date.parse(a.date) - Date.parse(b.date)));
}
const person = (r) => ({ riderId: r.rider?.id || r.rider?.legacy_id, name: r.rider?.full_name || `${r.rider?.name || ''} ${r.rider?.surname || ''}`.trim(), number: r.rider?.number ?? null, iso: r.rider?.country?.iso || '', team: clean(r.team?.name), bike: clean(r.constructor?.name) });
export async function classification(sessionId, year) {
  const d = await get(`/results/session/${sessionId}/classification?seasonYear=${year}&test=false`, 10 * MIN);
  return arr(d).map((r) => ({ ...person(r), position: r.position ?? null, points: r.points ?? null, time: r.time || r.best_lap?.time || '', lap: r.best_lap?.time || '', gap: r.gap?.first ?? '', laps: r.total_laps ?? null, speed: r.top_speed ?? null, status: r.status || '' }));
}
export async function standings(seasonId, categoryId) {
  const d = await get(`/results/standings?seasonUuid=${seasonId}&categoryUuid=${categoryId}`, 10 * MIN);
  return arr(d).map((r) => ({ ...person(r), position: r.position ?? null, points: Number(r.points ?? 0) })).filter((r) => r.name);
}
// Race of the most recent finished event, for the Home card.
export async function lastRace(seasonId, year) {
  const evs = await events(seasonId, year); const past = evs.filter((e) => Date.parse(e.end) < Date.now()).reverse();
  const cats = await categories(seasonId); const top = cats[0]; if (!top) return null;
  for (const e of past.slice(0, 3)) {
    const ss = await sessions(e.id, top.id).catch(() => []); const race = ss.find((s) => s.type === 'RAC');
    if (!race) continue; const rows = await classification(race.id, year).catch(() => []);
    if (rows.length) return { event: e, category: top, rows };
  }
  return null;
}
export const flagOf = (iso) => (/^[A-Za-z]{2}$/.test(iso || '') ? String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : '🏁');
export const mgDate = (e) => { const a = new Date(e.start), b = new Date(e.end || e.start), mo = (d) => d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }); return a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}–${b.getUTCDate()} ${mo(a)}` : `${a.getUTCDate()} ${mo(a)} – ${b.getUTCDate()} ${mo(b)}`; };

// Alerts: MotoGP-class sessions of one event in the shape the alert planner expects.
const ALERT = { FP1: 'Practice 1', FP2: 'Practice 2', PR: 'Practice 1', Q2: 'Qualifying', NQ: 'Qualifying', SPR: 'Sprint', RAC: 'Race' };
export async function alertSessions(event, seasonId) {
  const top = (await categories(seasonId))[0]; if (!top) return [];
  const l = await sessions(event.id, top.id);
  return l.filter((s) => ALERT[s.type] && s.date).map((s) => { const a = Date.parse(s.date); return { session_name: ALERT[s.type], date_start: new Date(a).toISOString(), date_end: new Date(a + 45 * 60000).toISOString() }; }).filter((s) => !Number.isNaN(Date.parse(s.date_start)));
}
// Teams / constructors table built from the rider standings (every rider's points go to his team and his bike).
export function groupStandings(rows, key) {
  const m = new Map();
  rows.forEach((r) => { const k = r[key]; if (!k) return; const x = m.get(k) || { name: k, points: 0, riders: [] }; x.points += r.points || 0; x.riders.push(r.name); m.set(k, x); });
  return [...m.values()].sort((a, b) => b.points - a.points).map((x, i) => ({ ...x, position: i + 1 }));
}
// Everything one rider did in a season in the top class, read from the race (and sprint) classifications.
export async function riderSeason(seasonId, year, riderId) {
  const evs = (await events(seasonId, year)).filter((e) => Date.parse(e.end) < Date.now()); const top = (await categories(seasonId))[0]; if (!top) return [];
  const out = [];
  for (const e of evs) {
    const ss = await sessions(e.id, top.id).catch(() => []); const race = ss.find((s) => s.type === 'RAC'); if (!race) continue;
    const rows = await classification(race.id, year).catch(() => []); const me = rows.find((r) => r.riderId === riderId);
    const spr = ss.find((s) => s.type === 'SPR'); const sr = spr ? (await classification(spr.id, year).catch(() => [])).find((r) => r.riderId === riderId) : null;
    out.push({ event: e, race: me || null, sprint: sr || null });
  }
  return out;
}
