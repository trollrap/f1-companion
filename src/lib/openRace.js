import { jolpicaSchedule } from '../api/jolpica';
import { scheduleToMeeting } from '../api/season';
import { YEAR } from '../api/openf1';
// Opens the weekend of a race a driver took part in (any season) on the Race results, and asks the Round screen to scroll to that driver and flash his row.
export async function openPastRace(navigation, season, year, r, driverId) {
  let meeting = null;
  if (Number(year) === YEAR) meeting = season?.races?.find((x) => Number(x.round) === Number(r.round)) || null;
  if (!meeting) { try { const s = (await jolpicaSchedule(year)).find((x) => Number(x.round) === Number(r.round)); meeting = s ? scheduleToMeeting(s) : null; } catch {} }
  if (meeting) navigation.navigate('Round', { meeting, session: 'Race', focusDriverId: driverId });
}
