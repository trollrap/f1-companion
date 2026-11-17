// Quietly loads the data most screens need a few seconds after start-up, one request at a time, so the next screen opens from the cache
// (and keeps working without signal). Requests already go through the shared cache, so this costs nothing when the data is fresh.
import { driverStandings, constructorStandings, lastRace } from '../api/jolpica';
import { YEAR } from '../api/openf1';
export function warmCaches() {
  const t = setTimeout(async () => {
    for (const fn of [() => driverStandings(YEAR), () => constructorStandings(YEAR), () => lastRace(YEAR)]) { try { await fn(); } catch {} await new Promise((r) => setTimeout(r, 400)); }
  }, 4000);
  return () => clearTimeout(t);
}
