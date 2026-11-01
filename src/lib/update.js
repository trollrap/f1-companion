import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UPDATE_REPO } from '../config';
// Looks at the latest GitHub release of UPDATE_REPO and says whether it is newer than this install.
// Installing is done by opening the .apk link: Android downloads it and asks to install over the current app.
export const currentVersion = () => Constants.expoConfig?.version || '0.0.0';
export const updatesConfigured = () => !!UPDATE_REPO && Platform.OS === 'android'; // an iPhone cannot install an app from a download link: iOS builds update through TestFlight or a new IPA
const parts = (v) => String(v).replace(/^v/i, '').split('.').map((x) => parseInt(x, 10) || 0);
export function isNewer(a, b) { const x = parts(a), y = parts(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; }
const KEY = 'updateCheck', EVERY = 12 * 3600e3;
// Returns { status: 'off' | 'current' | 'available' | 'none' | 'error', version?, url?, notes? }. Without `force` it asks GitHub at most every 12 hours.
export async function checkUpdate(force = false) {
  if (!UPDATE_REPO) return { status: 'off' };
  let saved = null; try { saved = JSON.parse(await AsyncStorage.getItem(KEY)); } catch {}
  if (!force && saved && Date.now() - saved.t < EVERY && saved.v) return saved.v.version && isNewer(saved.v.version, currentVersion()) ? saved.v : { status: 'current' };
  try {
    const r = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
    if (r.status === 404) return { status: 'none' }; // GitHub answers 404 when the repository has no published release yet (or is private)
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json(), version = String(j.tag_name || '').replace(/^v/i, ''), apk = (j.assets || []).find((x) => /\.apk$/i.test(x.name));
    const v = { status: 'available', version, url: apk?.browser_download_url || j.html_url, notes: (j.body || '').slice(0, 400) };
    AsyncStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v })).catch(() => {});
    return isNewer(version, currentVersion()) ? v : { status: 'current', version };
  } catch (e) { return { status: 'error', error: String(e.message || e) }; }
}
