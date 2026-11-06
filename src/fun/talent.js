// Hand-made talent ratings (0-100) for drivers, used when a real driver joins a fantasy: [pace, qualifying, racecraft, consistency, wet weather, aggression].
// They are estimates for fun, not official numbers: a great driver stays great in a slow car (Alonso at Aston Martin), only the car changes the results.
// Anybody not listed gets a plain 72 with a little variation. Everything can be edited per driver in the app.
export const TALENT = {
  max_verstappen: [99, 96, 99, 95, 98, 80], hamilton: [94, 95, 95, 92, 97, 60], alonso: [92, 91, 98, 95, 95, 70], norris: [95, 95, 93, 88, 88, 55], leclerc: [96, 98, 91, 84, 86, 65],
  russell: [93, 95, 91, 90, 88, 58], piastri: [93, 92, 92, 92, 88, 50], antonelli: [90, 88, 85, 76, 80, 60], sainz: [89, 89, 91, 91, 86, 60], albon: [86, 84, 88, 90, 85, 50],
  gasly: [86, 85, 86, 86, 86, 60], ocon: [84, 82, 86, 86, 82, 70], rafael_camara: [78, 80, 76, 74, 74, 70], stroll: [78, 74, 78, 76, 84, 60], hadjar: [84, 84, 80, 76, 80, 65], colapinto: [82, 82, 80, 76, 80, 65],
  lawson: [83, 84, 82, 78, 80, 65], arvid_lindblad: [78, 78, 74, 70, 72, 60], bearman: [85, 84, 84, 80, 82, 62], hulkenberg: [86, 90, 87, 90, 86, 55], bortoleto: [83, 83, 80, 76, 78, 60],
  perez: [83, 82, 86, 80, 82, 70], bottas: [83, 82, 84, 88, 82, 45], tsunoda: [84, 85, 82, 76, 80, 70], ricciardo: [90, 88, 92, 82, 86, 75], vettel: [95, 97, 94, 88, 88, 60],
  raikkonen: [91, 92, 92, 88, 86, 55], button: [88, 86, 90, 92, 98, 40], massa: [87, 89, 84, 80, 82, 60], webber: [86, 87, 86, 86, 84, 55], rosberg: [92, 94, 90, 90, 86, 55],
  fangio: [98, 98, 99, 93, 94, 60], clark: [98, 99, 97, 92, 95, 45], senna: [98, 100, 96, 82, 100, 90], michael_schumacher: [97, 95, 98, 95, 94, 85], prost: [94, 92, 98, 98, 92, 45],
  lauda: [92, 90, 96, 96, 90, 45], stewart: [95, 93, 96, 92, 98, 55], mansell: [92, 92, 93, 78, 92, 85], piquet: [90, 90, 92, 88, 86, 55], brabham: [92, 88, 94, 92, 86, 50],
  hill: [88, 86, 90, 92, 90, 50], damon_hill: [88, 86, 90, 90, 92, 50], emerson_fittipaldi: [90, 88, 91, 90, 88, 50], hakkinen: [93, 94, 92, 86, 88, 55], villeneuve: [90, 91, 89, 78, 86, 80],
  moss: [96, 96, 97, 85, 98, 70], ascari: [94, 93, 95, 88, 88, 60], hunt: [92, 90, 92, 70, 88, 85], gilles_villeneuve: [93, 92, 94, 70, 95, 95], rindt: [93, 95, 90, 68, 90, 80],
  surtees: [90, 90, 92, 82, 86, 65], peterson: [92, 93, 90, 78, 90, 75], hulme: [86, 85, 88, 88, 84, 50], farina: [90, 90, 92, 80, 86, 70], andretti: [89, 90, 90, 86, 86, 55],
  jones: [88, 86, 92, 88, 86, 60], scheckter: [86, 84, 90, 86, 84, 55], keke_rosberg: [88, 87, 90, 80, 90, 75], hawthorn: [86, 86, 88, 80, 84, 60], phil_hill: [86, 86, 88, 84, 86, 50],
};
// Birth years of the drivers who race now (everybody else is treated as being in their prime).
export const BORN = { rafael_camara: 2005, max_verstappen: 1997, hamilton: 1985, alonso: 1981, norris: 1999, leclerc: 1997, russell: 1998, piastri: 2001, antonelli: 2006, sainz: 1994, albon: 1996, gasly: 1996, ocon: 1996, stroll: 1998, hadjar: 2004, colapinto: 2003, lawson: 2002, arvid_lindblad: 2007, bearman: 2005, hulkenberg: 1987, bortoleto: 2004, perez: 1990, bottas: 1989, tsunoda: 2000, ricciardo: 1989, vettel: 1987, raikkonen: 1979, button: 1980, massa: 1981, webber: 1976, rosberg: 1985 };
const jitter = (id, i) => { let h = 7 + i; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 9) - 4; };
export function attrsFor(ref, dobYear) {
  const t = TALENT[ref] || [0, 1, 2, 3, 4, 5].map((i) => 72 + jitter(ref, i)); const born = BORN[ref] || (dobYear && dobYear >= 1985 ? dobYear : null);
  const age = born ? Math.max(17, 2026 - born) : 28;
  const ovr = Math.round(t[0] * 0.4 + t[1] * 0.25 + t[2] * 0.25 + t[3] * 0.1);
  return { pace: t[0], quali: t[1], race: t[2], cons: t[3], wet: t[4], aggr: t[5], age, pot: age < 26 ? Math.min(99, ovr + Math.round((26 - age) * 1.6)) : ovr, skill: ovr, known: !!TALENT[ref] };
}
