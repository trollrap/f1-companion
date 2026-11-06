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

// ---- installing from inside the app (Android) ----
// The .apk is downloaded to the app's cache, handed to Android's installer (one confirmation tap, Android always asks), and the file is deleted
// on the next start, so old downloads never pile up. Needs expo-intent-launcher and the REQUEST_INSTALL_PACKAGES permission (added by app.config.js).
const dirOf = (FS) => `${FS.cacheDirectory}update/`;
export const canInstallInApp = () => { if (Platform.OS !== 'android') return false; try { require('expo-intent-launcher'); return true; } catch { return false; } };
// Removes downloaded installers that are already installed (or older). Called on every start.
export async function cleanupUpdates() {
  try {
    const FS = require('expo-file-system/legacy'); const dir = dirOf(FS); const info = await FS.getInfoAsync(dir); if (!info.exists) return;
    const cur = currentVersion();
    for (const f of await FS.readDirectoryAsync(dir)) {
      const m = /(\d+\.\d+\.\d+)/.exec(f);
      if (!m || !isNewer(m[1], cur)) await FS.deleteAsync(dir + f, { idempotent: true });
    }
  } catch {}
}
// Downloads and opens the installer. onProgress(0..1). Returns { ok: true } or { ok: false, error }.
export async function installUpdate(u, onProgress) {
  try {
    const FS = require('expo-file-system/legacy'); const IL = require('expo-intent-launcher');
    const dir = dirOf(FS); await FS.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    for (const f of await FS.readDirectoryAsync(dir).catch(() => [])) await FS.deleteAsync(dir + f, { idempotent: true }); // only the newest download is kept
    const dest = `${dir}f1-companion-${u.version}.apk`;
    const dl = FS.createDownloadResumable(u.url, dest, {}, (p) => { if (p.totalBytesExpectedToWrite > 0 && onProgress) onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite); });
    const res = await dl.downloadAsync();
    if (!res || res.status !== 200) throw new Error(`Download failed (${res?.status ?? 'no answer'})`);
    const info = await FS.getInfoAsync(dest); if (!info.exists || info.size < 1e6) throw new Error('The downloaded file is incomplete.');
    const uri = await FS.getContentUriAsync(dest);
    await IL.startActivityAsync('android.intent.action.VIEW', { data: uri, flags: 1, type: 'application/vnd.android.package-archive' });
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e?.message || e) }; }
}
