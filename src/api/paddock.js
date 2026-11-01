// Current-season driver numbers and team colours from OpenF1 (`/drivers?session_key=latest`), joined to Jolpica's standings by surname.
// If OpenF1 is unreachable the app falls back to Jolpica's permanent numbers and the static colours in theme.js.
import { cachedJSON, memo, HOUR } from '../lib/cache';
import { driverStandings } from './jolpica';
import { OPENF1 } from './openf1';
import { norm } from '../lib/names';

export async function paddockMeta(year) {
  return memo(`paddock:${year}`, 12 * HOUR, async () => {
    const standings = await driverStandings(year);
    let of = [];
    try { of = await cachedJSON(`${OPENF1}/drivers?session_key=latest`, 12 * HOUR); } catch {}
    if (!Array.isArray(of)) of = [];
    const drivers = {}, teamColors = {};
    standings.forEach((d) => {
      const hit = of.find((x) => norm(x.last_name) === norm(d.last)) || of.find((x) => norm(x.full_name).endsWith(norm(d.last)));
      drivers[d.driverId] = { number: hit?.driver_number ?? (d.permNumber ? Number(d.permNumber) : null), code: hit?.name_acronym || d.code || null };
      if (hit?.team_colour && d.teamId && !teamColors[d.teamId]) teamColors[d.teamId] = `#${hit.team_colour}`;
    });
    return { drivers, teamColors };
  });
}
