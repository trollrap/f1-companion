import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
// The last crashes the app could catch, kept on the phone: Settings > Crash log lists them so they can be sent for fixing.
// Besides errors, it records freezes (the app busy for over 4 seconds) and launches that follow a session that did not end properly, with the last screen.
const KEY = 'crashLog', MAX = 30;
export async function logCrash(err, where = '') {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(KEY)) || '[]'); const msg = String(err?.stack || err?.message || err).slice(0, 1800);
    if (list[0] && list[0].msg === msg && Date.now() - list[0].t < 5000) return;
    list.unshift({ t: Date.now(), where, msg }); await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}
export async function readCrashes() { try { const l = JSON.parse((await AsyncStorage.getItem(KEY)) || '[]'); return Array.isArray(l) ? l : []; } catch { return []; } }
export async function clearCrashes() { try { await AsyncStorage.removeItem(KEY); } catch {} }
// Breadcrumbs: which screen was open, when the app was last alive, and whether the last session ended properly. Android's "not responding" kills leave no JavaScript
// error behind, so this is what makes them visible: the next launch reports "ended without closing" with the last screen and how long it had run.
const SESS = 'sessionState';
let cur = { start: Date.now(), t: Date.now(), last: 'start', clean: false };
const write = () => { cur.t = Date.now(); AsyncStorage.setItem(SESS, JSON.stringify(cur)).catch(() => {}); };
export function crumb(name) { if (cur.last === name) return; cur.last = name; write(); }
async function beginSession() {
  try { const prev = JSON.parse((await AsyncStorage.getItem(SESS)) || 'null'); if (prev && prev.clean === false) await logCrash(`The last session ended without going to the background: Android stopped the app, or it was closed from the recent apps list. It was alive for about ${Math.max(0, Math.round((prev.t - prev.start) / 1000))} s. Last screen: ${prev.last}.`, 'unclean-exit'); } catch {}
  cur = { start: Date.now(), t: Date.now(), last: 'start', clean: false }; write();
}
let done = false;
// Records uncaught JavaScript errors, freezes of the JavaScript thread and unclean endings, then lets the normal handler run.
export function installCrashLog() {
  if (done) return; done = true;
  try {
    const EU = global.ErrorUtils; if (EU && EU.setGlobalHandler) { const prev = EU.getGlobalHandler && EU.getGlobalHandler(); EU.setGlobalHandler((e, fatal) => { logCrash(e, fatal ? 'fatal' : 'uncaught'); if (prev) prev(e, fatal); }); }
  } catch {}
  try {
    beginSession();
    AppState.addEventListener('change', (st) => { cur.clean = st !== 'active'; write(); });
    // A one-second timer that arrives more than four seconds late means the JavaScript thread was blocked that long (the usual cause of "not responding").
    let last = Date.now(); setInterval(() => { const now = Date.now(); const late = now - last - 1000; last = now; if (AppState.currentState === 'active' && late > 4000) logCrash(`The app froze for about ${Math.round(late / 1000)} s (the JavaScript thread was busy). Screen: ${cur.last}.`, 'freeze'); if (now - cur.t > 4000) write(); }, 1000);
  } catch {}
}
