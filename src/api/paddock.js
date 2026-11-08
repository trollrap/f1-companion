export const FIXED_NUMBERS = { rafael_camara: 51 }; // numbers the feeds do not carry yet
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
    const drivers = {}, teamColors = {}, votes = {};
    standings.forEach((d) => {
      const hit = of.find((x) => norm(x.last_name) === norm(d.last)) || of.find((x) => norm(x.full_name).endsWith(norm(d.last)));
      drivers[d.driverId] = { number: FIXED_NUMBERS[d.driverId] ?? hit?.driver_number ?? (d.permNumber ? Number(d.permNumber) : null), code: hit?.name_acronym || d.code || null };
      // A team's colour is the one most of its drivers report (a test or reserve driver in another car cannot override it).
      if (hit?.team_colour && /^[0-9a-f]{6}$/i.test(hit.team_colour) && d.teamId) { const v = (votes[d.teamId] = votes[d.teamId] || {}); v[hit.team_colour] = (v[hit.team_colour] || 0) + 1; }
    });
    Object.keys(votes).forEach((id) => { const best = Object.entries(votes[id]).sort((a, b) => b[1] - a[1])[0]; if (best) teamColors[id] = `#${best[0]}`; });
    return { drivers, teamColors };
  });
}
