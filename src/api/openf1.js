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
// Tyre stints of a finished race, ordered by finishing position. Compounds as OpenF1 names them (SOFT, MEDIUM, HARD, INTERMEDIATE, WET).
export async function raceStints(sessionKey) {
  const [stints, rows] = await Promise.all([get(`/stints?session_key=${sessionKey}`, DAY), sessionClassification(sessionKey)]);
  if (!Array.isArray(stints)) throw new Error('Unexpected OpenF1 response');
  const laps = Math.max(0, ...stints.map((s) => s.lap_end || 0));
  const by = {}; stints.forEach((s) => { (by[s.driver_number] ||= []).push({ n: s.stint_number, compound: String(s.compound || 'UNKNOWN').toUpperCase(), from: s.lap_start || 1, to: s.lap_end || laps, age: s.tyre_age_at_start || 0 }); });
  const out = rows.filter((r) => by[r.number]).map((r) => ({ position: r.position, number: r.number, last: r.last, color: r.color, stints: by[r.number].sort((a, b) => a.n - b.n) }));
  return { laps, rows: out };
}
