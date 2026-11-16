import AsyncStorage from '@react-native-async-storage/async-storage';
// The last crashes the app could catch, kept on the phone: Settings > Crash log lists them so they can be sent for fixing.
// Only errors raised in the app's own JavaScript are caught. If Android itself closes the app (memory, a native module), nothing can be recorded.
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
let done = false;
// Records uncaught JavaScript errors, then lets the normal handler run.
export function installCrashLog() {
  if (done) return; done = true;
  try {
    const EU = global.ErrorUtils; if (!EU || !EU.setGlobalHandler) return; const prev = EU.getGlobalHandler && EU.getGlobalHandler();
    EU.setGlobalHandler((e, fatal) => { logCrash(e, fatal ? 'fatal' : 'uncaught'); if (prev) prev(e, fatal); });
  } catch {}
}
