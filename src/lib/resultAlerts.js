// "Results" notifications: when Jolpica has published a qualifying, sprint or race classification, send a short "results available" notification.
// Runs when the app opens or comes to the foreground and, in an installed build, as an Android background task (about every 15 min at best:
// Android decides the real timing, so it can be later). Nothing is sent until the server really has the classification.
// Needs a build with expo-background-task. In Expo Go the background part is skipped.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { liveJSON } from './cache';
import { notifyNow } from './notifications';
import { shortName } from './time';

export const TASK = 'f1-results-check';
const BASE = 'https://api.jolpi.ca/ergast/f1/current/last';
const KINDS = [
  { type: 'Race', path: 'results', list: 'Results', label: 'Race result' },
  { type: 'Qualifying', path: 'qualifying', list: 'QualifyingResults', label: 'Qualifying result' },
  { type: 'Sprint', path: 'sprint', list: 'SprintResults', label: 'Sprint result' },
];
const SEEN = 'resultsSeen';

async function prefsNow() { try { return JSON.parse(await AsyncStorage.getItem('prefs')) || {}; } catch { return {}; } }

// Returns how many notifications were sent. `force` ignores the on/off switch (used by the Settings test button).
export async function checkResults({ force = false } = {}) {
  const prefs = await prefsNow();
  if (!force && !prefs.results) return 0;
  let seen = null; try { seen = JSON.parse(await AsyncStorage.getItem(SEEN)); } catch {}
  const baseline = !Array.isArray(seen); const done = new Set(baseline ? [] : seen); let sent = 0;
  for (const k of KINDS) {
    try {
      const { status, json } = await liveJSON(`${BASE}/${k.path}.json`);
      const race = status === 200 ? json?.MRData?.RaceTable?.Races?.[0] : null, rows = race?.[k.list];
      if (!rows?.length) continue; // not published yet: try again next time
      const id = `${race.season}-${race.round}-${k.type}`;
      if (done.has(id)) continue;
      done.add(id);
      if (baseline && !force) continue; // first run only records what already exists, so enabling the switch never spams old results
      if (prefs.types && prefs.types[k.type] === false) continue;
      if (await notifyNow(`${shortName(race.raceName)} · ${k.label}`, 'Results are available.')) sent++;
    } catch {}
  }
  AsyncStorage.setItem(SEEN, JSON.stringify([...done].slice(-60))).catch(() => {});
  return sent;
}

function supported() {
  if (Platform.OS !== 'android' || Constants.executionEnvironment === 'storeClient') return false; // Expo Go
  return !!requireOptionalNativeModule('ExpoTaskManager') && !!requireOptionalNativeModule('ExpoBackgroundTask');
}
let TM = null, BT = null;
function load() {
  if (TM && BT) return true;
  if (!supported()) return false;
  try { TM = require('expo-task-manager'); BT = require('expo-background-task'); return true; } catch { TM = BT = null; return false; }
}
// Defined at import time (App.js imports this file) so Android can start it while the app is closed.
if (load()) {
  try { TM.defineTask(TASK, async () => { try { await checkResults(); return BT.BackgroundTaskResult.Success; } catch { return BT.BackgroundTaskResult.Failed; } }); } catch {}
}
// Turns the background check on or off to match the switch.
export async function syncResultTask(on) {
  if (!load()) return false;
  try {
    const reg = await TM.isTaskRegisteredAsync(TASK);
    if (on && !reg) await BT.registerTaskAsync(TASK, { minimumInterval: 15 });
    if (!on && reg) await BT.unregisterTaskAsync(TASK);
    return true;
  } catch { return false; }
}
