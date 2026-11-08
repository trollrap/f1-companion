// OpenF1: schedule and sessions (free), gmt_offset for track time, track outline from /location. Live timing needs the paid Sponsor tier.
// Field names below were checked against openf1.org/docs on 27 Oct 2026. Historical data is free; real-time data is paid.
import { cachedJSON, HOUR, DAY } from '../lib/cache';
import { nicePart, splitName } from '../lib/names';
export const OPENF1 = 'https://api.openf1.org/v1';
export const YEAR = 2026;
const get = (path, ttl) => cachedJSON(`${OPENF1}${path}`, ttl);

export async function openf1Season() {
  const ms = await get(`/meetings?year=${YEAR}`, HOUR);
  if (!Array.isArray(ms)) throw new Error('Unexpected OpenF1 response');
  const races = ms.filter((m) => !m.is_cancelled && !/test/i.test(m.meeting_name))
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start)).map((m, i) => ({ ...m, round: i + 1 }));
  if (!races.length) throw new Error('No meetings returned');
  const sprints = new Set((await get(`/sessions?year=${YEAR}&session_name=Sprint`, HOUR)).map((x) => x.meeting_key));
  races.forEach((r) => { r.has_sprint = sprints.has(r.meeting_key); });
  return races;
}
export async function fetchSessions(meetingKey) {
  const s = await get(`/sessions?meeting_key=${meetingKey}`, 15 * 60e3);
  if (!Array.isArray(s)) throw new Error('Unexpected OpenF1 response');
  return s.filter((x) => !x.is_cancelled).sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
}
// Real track outline: one clean lap of a past race at this circuit, plotted from x/y samples (about 3.7 per second).
export async function fetchOutline(circuitKey) {
  if (!circuitKey) return null;
  const all = await get(`/sessions?circuit_key=${circuitKey}&session_name=Race`, 7 * DAY);
  const sess = all.filter((x) => Date.parse(x.date_end) < Date.now()).sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start))[0];
  if (!sess) return null;
  const laps = await get(`/laps?session_key=${sess.session_key}&lap_number=3`, 7 * DAY);
  const lap = laps.find((l) => l.lap_duration && l.date_start && !l.is_pit_out_lap);
  if (!lap) return null;
  const end = new Date(Date.parse(lap.date_start) + lap.lap_duration * 1000).toISOString();
  const loc = await get(`/location?session_key=${sess.session_key}&driver_number=${lap.driver_number}&date%3E=${lap.date_start}&date%3C=${end}`, 30 * DAY);
  return loc.filter((p) => p.x || p.y).map((p) => [p.x, p.y]);
}
// Classification for any session. In qualifying-type sessions duration and gap_to_leader are arrays of three values.
const lapFmt = (t) => { const m = Math.floor(t / 60); return `${m}:${(t - m * 60).toFixed(3).padStart(6, '0')}`; };
const last = (v) => (Array.isArray(v) ? [...v].reverse().find((x) => x != null) : v);
export async function sessionClassification(sessionKey) {
  const [res, drv] = await Promise.all([get(`/session_result?session_key=${sessionKey}`, HOUR), get(`/drivers?session_key=${sessionKey}`, DAY)]);
  return res.sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).map((r) => {
    const d = drv.find((x) => x.driver_number === r.driver_number) || {}, best = last(r.duration), gap = last(r.gap_to_leader);
    const nm = d.last_name ? { first: nicePart(d.first_name), last: nicePart(d.last_name, true) } : splitName(d.full_name || `#${r.driver_number}`);
    return { position: r.position, number: r.driver_number, first: nm.first, last: nm.last, driver: `${nm.first} ${nm.last}`.trim(), team: d.team_name, color: d.team_colour ? `#${d.team_colour}` : null,
      time: typeof best === 'number' ? lapFmt(best) : r.dsq ? 'DSQ' : r.dns ? 'DNS' : r.dnf ? 'DNF' : '—', gap: typeof gap === 'number' && gap > 0 ? `+${gap.toFixed(3)}` : '' };
  });
}
// Tire stints of a finished race, ordered by finishing position. Compounds as OpenF1 names them (SOFT, MEDIUM, HARD, INTERMEDIATE, WET).
export async function raceStints(sessionKey) {
  const [stints, rows] = await Promise.all([get(`/stints?session_key=${sessionKey}`, DAY), sessionClassification(sessionKey)]);
  if (!Array.isArray(stints)) throw new Error('Unexpected OpenF1 response');
  const laps = Math.max(0, ...stints.map((s) => s.lap_end || 0));
  const by = {}; stints.forEach((s) => { (by[s.driver_number] ||= []).push({ n: s.stint_number, compound: String(s.compound || 'UNKNOWN').toUpperCase(), from: s.lap_start || 1, to: s.lap_end || laps, age: s.tyre_age_at_start || 0 }); });
  const out = rows.filter((r) => by[r.number]).map((r) => ({ position: r.position, number: r.number, last: r.last, color: r.color, stints: by[r.number].sort((a, b) => a.n - b.n) }));
  return { laps, rows: out };
}
// Session key of a past session (the schedule rebuilt from Jolpica has none): OpenF1 has sessions from 2023 on.
export async function findSessionKey(year, name, dateISO) {
  if (Number(year) < 2023) return null;
  const l = await get(`/sessions?year=${year}&session_name=${encodeURIComponent(name)}`, DAY);
  if (!Array.isArray(l)) return null;
  const t = Date.parse(dateISO), hit = l.map((x) => ({ x, d: Math.abs(Date.parse(x.date_start) - t) })).sort((a, b) => a.d - b.d)[0];
  return hit && hit.d < 4 * 86400e3 ? hit.x.session_key : null;
}
// Penalties the stewards announced, read from the race control messages: { number, kind, text, places, secs, date }.
// kind: grid (places back), back (back of the grid), pit (pit lane start), time (seconds added), stopgo, drive, dsq. Messages saying a penalty was
// served, withdrawn, or that no action is taken are ignored. A driver is matched by car number.
export async function racePenalties(sessionKey) {
  const msgs = await get(`/race_control?session_key=${sessionKey}`, 10 * 60e3);
  if (!Array.isArray(msgs)) return [];
  const out = [], seen = new Set();
  [...msgs].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).forEach((m) => {
    const t = String(m.message || '').toUpperCase();
    if (!t || /SERVED|DELETED|NO FURTHER|NO INVESTIGATION|NOTED|UNDER INVESTIGATION|WILL BE INVESTIGATED|REVIEW|WARNING|WITHDRAWN|CANCELLED/.test(t)) return;
    const num = m.driver_number ?? Number((/CAR (\d+)/.exec(t) || [])[1]); if (!num) return;
    let x, p = null;
    if ((x = /(\d+) PLACE GRID PENALTY/.exec(t))) p = { kind: 'grid', places: Number(x[1]), text: `Grid −${x[1]}` };
    else if (/BACK OF THE GRID/.test(t)) p = { kind: 'back', text: 'Back of the grid' };
    else if (/PIT ?LANE/.test(t) && /START/.test(t)) p = { kind: 'pit', text: 'Pit lane start' };
    else if ((x = /(\d+) SECOND TIME PENALTY/.exec(t))) p = { kind: 'time', secs: Number(x[1]), text: `+${x[1]}s penalty` };
    else if ((x = /(\d+) SECOND STOP.?GO/.exec(t))) p = { kind: 'stopgo', text: `${x[1]}s stop-go` };
    else if (/DRIVE.?THROUGH/.test(t)) p = { kind: 'drive', text: 'Drive-through' };
    else if (/DISQUALIFIED|EXCLUDED/.test(t) && !/LAP|TIME \d/.test(t)) p = { kind: 'dsq', text: 'Disqualified' };
    if (!p) return;
    const key = `${num}:${p.text}`; if (seen.has(key)) return; seen.add(key);
    out.push({ number: Number(num), date: m.date, ...p });
  });
  return out;
}

// Fallback for practice sessions whose official result is not published (yet): each driver's best lap, from the lap data.
export async function sessionBestLaps(sessionKey) {
  const [laps, drv] = await Promise.all([get(`/laps?session_key=${sessionKey}`, 120000), get(`/drivers?session_key=${sessionKey}`, DAY)]);
  if (!Array.isArray(laps)) return [];
  const best = {}; laps.forEach((l) => { if (typeof l.lap_duration === 'number' && l.lap_duration > 0 && !(best[l.driver_number] <= l.lap_duration)) best[l.driver_number] = l.lap_duration; });
  const rows = Object.keys(best).map((n) => ({ n: Number(n), t: best[n] })).sort((a, b) => a.t - b.t);
  return rows.map((r, i) => { const d = drv.find((x) => x.driver_number === r.n) || {}; const nm = d.last_name ? { first: nicePart(d.first_name), last: nicePart(d.last_name, true) } : splitName(d.full_name || `#${r.n}`);
    return { position: i + 1, number: r.n, first: nm.first, last: nm.last, driver: `${nm.first} ${nm.last}`.trim(), team: d.team_name, color: d.team_colour ? `#${d.team_colour}` : null, time: lapFmt(r.t), gap: i ? `+${(r.t - rows[0].t).toFixed(3)}` : '' }; });
}
