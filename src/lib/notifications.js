import { Platform } from 'react-native';
import { tr } from './i18n';
import { ui } from './motion';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { hm, shortName } from './time';

// expo-notifications must never be required when its native module is missing: Metro reports a failed require() as a fatal error
// (try/catch cannot stop it). Expo Go lacks the module, so we check first and only require it when it is really there.
let N = null, tried = false;
function supported() {
  if (Constants.executionEnvironment === 'storeClient') return false; // Expo Go
  if (Platform.OS === 'android' && !requireOptionalNativeModule('ExpoTopicSubscriptionModule')) return false;
  return true;
}
function mod() {
  if (!tried) {
    tried = true;
    if (supported()) {
      try {
        N = require('expo-notifications');
        N.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
      } catch { N = null; }
    }
  }
  return N;
}
export const notificationsAvailable = () => !!mod();

export async function ensurePermission() {
  const n = mod(); if (!n) return false;
  try {
    if (Platform.OS === 'android') await n.setNotificationChannelAsync('sessions', { name: tr('Session alerts'), importance: n.AndroidImportance.HIGH }).catch(() => {});
    const cur = await n.getPermissionsAsync();
    if (cur.granted) return true;
    return (await n.requestPermissionsAsync()).granted;
  } catch { return false; }
}
const leadText = (m) => (ui.lang === 'el' ? (m === 0 ? 'τώρα' : m >= 1440 ? `σε ${m / 1440} ημέρα` : m >= 60 ? `σε ${m / 60} ώρ.` : `σε ${m} λεπτά`) : (m === 0 ? 'now' : m >= 1440 ? `in ${m / 1440} day` : m >= 60 ? `in ${m / 60} h` : `in ${m} min`));
// Every alert the preferences ask for: one per enabled session and per chosen lead time, only in the future.
export function plannedAlerts(sessions, prefs, now = Date.now()) {
  const out = [];
  sessions.filter((s) => prefs.types[s.session_name]).forEach((s) => {
    const start = Date.parse(s.date_start);
    prefs.leads.forEach((lead) => { const at = start - lead * 60000; if (at > now) out.push({ session: s, lead, at, start }); });
  });
  return out.sort((a, b) => a.at - b.at);
}
// Replaces every scheduled alert with the ones the preferences ask for. Permission is requested only when something is enabled.
export async function scheduleSessionAlerts(meeting, sessions, prefs) {
  const n = mod(); if (!n) return 0;
  // clear only session alerts: football kickoff alerts (identifier foot-...) stay
  try { const all = await n.getAllScheduledNotificationsAsync(); await Promise.all(all.filter((x) => !String(x.identifier).startsWith('foot-')).map((x) => n.cancelScheduledNotificationAsync(x.identifier))); } catch { await n.cancelAllScheduledNotificationsAsync(); }
  const wanted = plannedAlerts(sessions, prefs);
  // "Results" alerts: a local alert shortly after a qualifying, sprint or race ends. It is set up in advance, so it arrives even when the app is closed
  // and Android never gets to run the background check. It says the classification should be up, because it is timed rather than read from a server.
  const results = prefs.results ? sessions.filter((x) => ['Qualifying', 'Sprint', 'Race'].includes(x.session_name) && prefs.types[x.session_name] !== false).map((x) => ({ x, at: Date.parse(x.date_end) + 30 * 60000 })).filter((r) => r.at > Date.now()) : [];
  if ((!wanted.length && !results.length) || !(await ensurePermission())) return 0;
  for (const r of results) {
    try { await n.scheduleNotificationAsync({ content: { title: `${tr(r.x.session_name)} · ${tr(shortName(meeting.meeting_name))}`, body: ui.lang === 'el' ? 'Τα αποτελέσματα πρέπει να είναι διαθέσιμα τώρα.' : 'The results should be available now.' }, trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(r.at), channelId: 'sessions' } }); } catch {}
  }
  for (const a of wanted) {
    await n.scheduleNotificationAsync({
      content: { title: `${tr(a.session.session_name)} · ${tr(shortName(meeting.meeting_name))}`, body: ui.lang === 'el' ? (a.lead ? `Ξεκινά ${leadText(a.lead)} (${hm(a.start)})` : `Ξεκινά τώρα (${hm(a.start)})`) : (a.lead ? `Starts ${leadText(a.lead)} (${hm(a.start)})` : `Starting now (${hm(a.start)})`) },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(a.at), channelId: 'sessions' },
    });
  }
  return wanted.length + results.length;
}
// Shows a notification straight away (used for session results).
export async function notifyNow(title, body) {
  const n = mod(); if (!n) return false;
  if (!(await ensurePermission())) return false;
  // A plain {channelId} trigger has no type, which newer expo-notifications versions can refuse without any visible error. A one-second interval
  // trigger is the same kind the working test button uses.
  try { await n.scheduleNotificationAsync({ content: { title, body }, trigger: { type: n.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: 'sessions' } }); return true; } catch {}
  try { await n.scheduleNotificationAsync({ content: { title, body }, trigger: null }); return true; } catch { return false; }
}
export async function sendTestNotification() {
  const n = mod(); if (!n) return 'unavailable';
  if (!(await ensurePermission())) return 'denied';
  await n.scheduleNotificationAsync({ content: { title: 'F1 Companion', body: tr('Alerts are working.') }, trigger: { type: n.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: 'sessions' } });
  return 'ok';
}

// Football: a reminder at kick-off for one match. Returns 'ok', 'past', 'denied' or 'unavailable'.
export async function scheduleKickoff(id, title, whenMs) {
  const n = mod(); if (!n) return 'unavailable';
  if (whenMs <= Date.now() + 5000) return 'past';
  if (!(await ensurePermission())) return 'denied';
  await n.cancelScheduledNotificationAsync(`foot-${id}`).catch(() => {});
  await n.scheduleNotificationAsync({ identifier: `foot-${id}`, content: { title, body: tr('Kick-off now') }, trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(whenMs), channelId: 'sessions' } });
  return 'ok';
}
export async function cancelKickoff(id) { const n = mod(); if (n) await n.cancelScheduledNotificationAsync(`foot-${id}`).catch(() => {}); }
export async function hasKickoff(id) { const n = mod(); if (!n) return false; try { return (await n.getAllScheduledNotificationsAsync()).some((x) => x.identifier === `foot-${id}`); } catch { return false; } }
