import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyNow } from './notifications';
import { today } from './kv';
// Monday recap: once on Monday from 09:00, one notification about the latest race and your favourite drivers and teams.
// It piggy-backs on the results check, so it runs when the app opens and, in an installed build with result alerts on, in the background.
const KEY = 'recapSent';
export async function maybeWeeklyRecap(prefs, force = false) {
  if (!force && !prefs.opts?.mondayRecap) return 0;
  const d = new Date(); if (!force && (d.getDay() !== 1 || d.getHours() < 9)) return 0;
  const day = today(); let last = null; try { last = await AsyncStorage.getItem(KEY); } catch {} if (!force && last === day) return 0;
  const { buildDigest } = require('./digest'); const g = await buildDigest().catch(() => null);
  if (!g || g.empty || !g.race) return 0; if (!force && Date.now() - Date.parse(g.race.date) > 9 * 864e5) return 0;
  const lines = [];
  g.drivers.forEach((x) => { const fin = x.posText === undefined || x.posText === null ? null : /^\d+$/.test(String(x.posText)) ? `P${x.pos}` : String(x.posText); lines.push(`${x.code || x.name}${fin ? ` ${fin}` : ''}${x.seasonPos ? `, P${x.seasonPos} in the title race` : ''}`); });
  g.teams.forEach((x) => { lines.push(`${x.name}${x.best ? ` best P${x.best}` : ''}${x.seasonPos ? `, P${x.seasonPos} in the teams' table` : ''}`); });
  if (!lines.length) return 0;
  const ok = await notifyNow(`Your week in F1 · ${g.race.name}`, lines.slice(0, 5).join('. '));
  if (ok) { try { await AsyncStorage.setItem(KEY, day); } catch {} }
  return ok ? 1 : 0;
}
