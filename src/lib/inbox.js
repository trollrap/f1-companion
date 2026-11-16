import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY = 'alertInbox', MAX = 80;
// Every alert the app shows straight away (results, news) is logged here so the Alerts inbox can list it.
export async function logAlert(title, body, status) {
  try { const r = JSON.parse((await AsyncStorage.getItem(KEY)) || '[]'); r.unshift({ t: Date.now(), title: String(title || ''), body: String(body || ''), status }); await AsyncStorage.setItem(KEY, JSON.stringify(r.slice(0, MAX))); } catch {}
}
export async function readInbox() { try { const r = JSON.parse((await AsyncStorage.getItem(KEY)) || '[]'); return Array.isArray(r) ? r : []; } catch { return []; } }
export async function clearInbox() { try { await AsyncStorage.removeItem(KEY); } catch {} }
// Alerts already scheduled with Android (session reminders, birthdays): [{ id, title, body, at }] soonest first. Empty in Expo Go.
export async function upcomingAlerts() {
  try { const n = require('expo-notifications'); const all = await n.getAllScheduledNotificationsAsync();
    return all.map((x) => { const t = x.trigger || {}; const at = t.value ? new Date(t.value).getTime() : t.seconds && typeof t.seconds === 'number' ? Date.now() + t.seconds * 1000 : null; return { id: x.identifier, title: x.content?.title || '', body: x.content?.body || '', at }; }).filter((x) => x.at && x.at > Date.now()).sort((a, b) => a.at - b.at);
  } catch { return []; }
}
