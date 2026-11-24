export const FIXED_NUMBERS = { rafael_camara: 51 }; // numbers the feeds do not carry yet
// Permanent numbers of drivers from the last decade, used when the live driver record (or the saved history, which has no numbers) cannot supply one.
export const PERM_NUMBERS = { hamilton: 44, max_verstappen: 33, alonso: 14, vettel: 5, raikkonen: 7, bottas: 77, perez: 11, ricciardo: 3, sainz: 55, leclerc: 16, norris: 4, russell: 63, stroll: 18, ocon: 31, gasly: 10, albon: 23, tsunoda: 22, zhou: 24, magnussen: 20, hulkenberg: 27, piastri: 81, sargeant: 2, de_vries: 21, lawson: 30, bearman: 87, colapinto: 43, doohan: 7, antonelli: 12, hadjar: 6, bortoleto: 5, kevin_magnussen: 20, giovinazzi: 99, kvyat: 26, grosjean: 8, massa: 19, button: 22, rosberg: 6, maldonado: 13, ericsson: 9, wehrlein: 94, vandoorne: 2, hartley: 28, gutierrez: 21, palmer: 30, nasr: 12, haryanto: 88, mazepin: 9, latifi: 6, schumacher: 47, mick_schumacher: 47, fittipaldi: 51, kubica: 88, di_resta: 40, lindblad: 41, arvid_lindblad: 41, ...FIXED_NUMBERS };
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
