// Season loader. OpenF1 is the primary source (it has gmt_offset for track time). Jolpica's schedule is the fallback
// (OpenF1 may refuse free requests around live sessions) and also supplies the round numbers used for results.
import { YEAR, openf1Season, fetchSessions } from './openf1';
import { jolpicaSchedule } from './jolpica';
import { NAME3 } from '../lib/time';

const SESSION_BLOCKS = [['FirstPractice', 'Practice 1', 60], ['SecondPractice', 'Practice 2', 60], ['ThirdPractice', 'Practice 3', 60],
  ['SprintQualifying', 'Sprint Qualifying', 45], ['SprintShootout', 'Sprint Qualifying', 45], ['Sprint', 'Sprint', 60], ['Qualifying', 'Qualifying', 60]];
// Jolpica gives start times only, so end times are estimates and are flagged so the UI shows the start alone.
export function scheduleSessions(s) {
  const mk = (name, block, mins) => {
    if (!block?.date || !block?.time) return null;
    const a = Date.parse(`${block.date}T${block.time}`); if (Number.isNaN(a)) return null;
    return { session_name: name, date_start: new Date(a).toISOString(), date_end: new Date(a + mins * 60000).toISOString(), end_estimated: true, meeting_key: `j${s.round}` };
  };
  const out = SESSION_BLOCKS.map(([k, name, m]) => mk(name, s[k], m)).filter(Boolean);
  const race = mk('Race', { date: s.date, time: s.time }, 120); if (race) out.push(race);
  return out.sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
}
export function scheduleToMeeting(s) {
  const sessions = scheduleSessions(s), L = s.Circuit.Location;
  return { meeting_key: `j${s.round}`, meeting_name: s.raceName, location: L.locality, country_name: L.country, country_code: NAME3[L.country] || '',
    circuit_short_name: s.Circuit.circuitName, round: s.round, has_sprint: !!s.Sprint, sessions,
    date_start: sessions[0]?.date_start || `${s.date}T00:00:00Z`, date_end: sessions.at(-1)?.date_end || `${s.date}T23:59:59Z` };
}
export async function sessionsOf(meeting) {
  if (meeting.sessions) return meeting.sessions;
  try { return await fetchSessions(meeting.meeting_key); }
  catch (e) {
    const sched = await jolpicaSchedule(YEAR).catch(() => null), s = sched?.find((x) => x.round === meeting.round);
    if (s) return scheduleSessions(s);
    throw e;
  }
}
export async function fetchSeason() {
  const sched = await jolpicaSchedule(YEAR).catch(() => null);
  let races, source = 'openf1';
  try { races = await openf1Season(); }
  catch (e) { if (!sched) throw e; races = sched.map(scheduleToMeeting); source = 'jolpica'; }
  if (source === 'openf1' && sched) { // align round numbers with Jolpica by race date, so results always match the right race
    races.forEach((r) => { const hit = sched.find((s) => Math.abs(Date.parse(s.date) - Date.parse(r.date_end)) <= 36 * 3600e3); if (hit) r.round = hit.round; });
  }
  const next = races.find((m) => Date.parse(m.date_end) >= Date.now()) || null;
  let sessions = [];
  if (next) sessions = await sessionsOf(next).catch(() => []);
  return { races, next, sessions, total: sched?.length || races.length, source };
}
