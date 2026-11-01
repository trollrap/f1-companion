import { jolpicaSchedule } from '../api/jolpica';
import { scheduleToMeeting } from '../api/season';
import { circuitFor } from '../data/circuits';
// The race weekend a circuit hosted in a given year (first match when it hosted two), as a meeting the Round screen can open.
export async function weekendAt(circuit, year) {
  const sched = await jolpicaSchedule(year);
  const hit = sched.find((r) => { const L = r.Circuit?.Location || {}; return circuit.match.test(`${r.Circuit?.circuitName} ${L.locality} ${L.country}`.toLowerCase()); });
  return hit ? scheduleToMeeting(hit) : null;
}
export { circuitFor };
