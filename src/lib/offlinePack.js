import { fetchSessions, fetchOutline, openf1Season, sessionClassification, YEAR } from '../api/openf1';
import { driverStandings, constructorStandings, lineups, jolpicaSchedule } from '../api/jolpica';
// "Save for offline": reads everything a race weekend page needs once, so the app's saved copy (kept up to 60 days) answers when there is no signal.
// Returns { ok, failed } with the names of the parts that could not be fetched.
export async function saveWeekend(meeting, onStep) {
  const ok = [], failed = []; const step = async (name, fn) => { try { onStep && onStep(name); await fn(); ok.push(name); } catch { failed.push(name); } };
  let sessions = [];
  await step('Schedule', async () => { await openf1Season(); await jolpicaSchedule(YEAR); });
  await step('Sessions', async () => { sessions = await fetchSessions(meeting.meeting_key); });
  await step('Track map', async () => { await fetchOutline(meeting.circuit_key); });
  await step('Standings', async () => { await Promise.all([driverStandings(YEAR), constructorStandings(YEAR)]); });
  await step('Line-ups', async () => { await lineups(YEAR); });
  for (const s of sessions.filter((x) => Date.parse(x.date_end) < Date.now())) await step(`${s.session_name} results`, async () => { await sessionClassification(s.session_key); });
  return { ok, failed };
}
