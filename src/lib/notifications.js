import { Platform } from 'react-native';
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
    if (Platform.OS === 'android') await n.setNotificationChannelAsync('sessions', { name: 'Session alerts', importance: n.AndroidImportance.HIGH }).catch(() => {});
    const cur = await n.getPermissionsAsync();
    if (cur.granted) return true;
    return (await n.requestPermissionsAsync()).granted;
  } catch { return false; }
}
const leadText = (m) => (m === 0 ? 'now' : m >= 1440 ? `in ${m / 1440} day` : m >= 60 ? `in ${m / 60} h` : `in ${m} min`);
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
  await n.cancelAllScheduledNotificationsAsync();
  const wanted = plannedAlerts(sessions, prefs);
  if (!wanted.length || !(await ensurePermission())) return 0;
  for (const a of wanted) {
    await n.scheduleNotificationAsync({
      content: { title: `${a.session.session_name} · ${shortName(meeting.meeting_name)}`, body: a.lead ? `Starts ${leadText(a.lead)} (${hm(a.start)})` : `Starting now (${hm(a.start)})` },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(a.at), channelId: 'sessions' },
    });
  }
  return wanted.length;
}
// Shows a notification straight away (used for session results).
export async function notifyNow(title, body) {
  const n = mod(); if (!n) return false;
  if (!(await ensurePermission())) return false;
  await n.scheduleNotificationAsync({ content: { title, body }, trigger: { channelId: 'sessions' } });
  return true;
}
export async function sendTestNotification() {
  const n = mod(); if (!n) return 'unavailable';
  if (!(await ensurePermission())) return 'denied';
  await n.scheduleNotificationAsync({ content: { title: 'F1 Companion', body: 'Alerts are working.' }, trigger: { type: n.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: 'sessions' } });
  return 'ok';
}
