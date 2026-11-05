// Turns a view into a picture and shares or saves it. Needs react-native-view-shot, expo-sharing and expo-media-library in the build;
// without them (Expo Go, old build) the functions return 'unavailable' and the caller falls back to text.
import { requireOptionalNativeModule } from 'expo-modules-core';
export const canShareImage = () => !!requireOptionalNativeModule('RNViewShot') && !!requireOptionalNativeModule('ExpoSharing');
export const canSaveImage = () => !!requireOptionalNativeModule('RNViewShot') && !!requireOptionalNativeModule('ExpoMediaLibrary');
const shot = (ref) => require('react-native-view-shot').captureRef(ref, { format: 'png', quality: 1 });
export async function shareImage(ref) {
  if (!canShareImage()) return 'unavailable';
  try { const Sharing = require('expo-sharing'); const uri = await shot(ref); if (!(await Sharing.isAvailableAsync())) return 'unavailable'; await Sharing.shareAsync(uri, { mimeType: 'image/png' }); return 'ok'; } catch { return 'error'; }
}
// Saving: ask for photo access only (Android 13+ rejects the request when it also asks for video and music, which was why saving failed),
// store the picture with createAssetAsync, and if anything goes wrong fall back to the share sheet, where "Save to gallery/Drive/Files" is one tap away.
let lastError = '';
export const getLastError = () => lastError;
async function writeInto(dir, uri) {
  const FS = require('expo-file-system/legacy'), SAF = FS.StorageAccessFramework; const b64 = await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 });
  const f = await SAF.createFileAsync(dir, `f1-companion-${Date.now()}`, 'image/png'); await FS.writeAsStringAsync(f, b64, { encoding: FS.EncodingType.Base64 });
}
export async function saveImage(ref) {
  lastError = '';
  if (!canShareImage() && !canSaveImage()) return 'unavailable';
  let uri;
  try { uri = await shot(ref); } catch (e) { lastError = String(e?.message || e); return 'error'; }
  // A remembered folder wins: no questions, no menu.
  const saved = await getSaveFolder();
  if (saved) { try { await writeInto(saved, uri); return 'folder'; } catch (e) { lastError = String(e?.message || e); } }
  if (canSaveImage()) {
    try {
      const ML = require('expo-media-library');
      let perm = await ML.getPermissionsAsync(true, ['photo']);
      if (!perm.granted) perm = await ML.requestPermissionsAsync(true, ['photo']);
      if (perm.granted) { await ML.createAssetAsync(uri); return 'ok'; }
      lastError = 'photo access not allowed';
    } catch (e) { lastError = String(e?.message || e); }
  }
    // The folder is asked for once and remembered (in two places, so it survives a cleared preference): after that pictures are written straight into it.
  try {
    const FS = require('expo-file-system/legacy'), SAF = FS.StorageAccessFramework;
    if (SAF) {
      const p = await chooseSaveFolder();
      if (p) { await writeInto(p, uri); return 'folder'; }
      lastError = lastError || 'no folder chosen';
    }
  } catch (e) { lastError = `${lastError} ${e?.message || e}`.trim(); }
  try { const Sharing = require('expo-sharing'); if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Save picture' }); return 'shared'; } } catch (e) { lastError = `${lastError} ${e?.message || ''}`.trim(); }
  return 'error';
}

// The remembered picture folder (a Storage Access Framework tree address), or null.
export async function getSaveFolder() {
  try { const AS = require('@react-native-async-storage/async-storage').default; const { readDurable } = require('./durable'); const a = await AS.getItem('saveDir'); const b = await readDurable('saveDir'); return a || b || null; } catch { return null; }
}
// Asks for the folder once and stores it. Returns the folder address, or null when nothing was chosen.
export async function chooseSaveFolder() {
  try {
    const FS = require('expo-file-system/legacy'), SAF = FS.StorageAccessFramework; if (!SAF) return null;
    const p = await SAF.requestDirectoryPermissionsAsync(); if (!p.granted) return null;
    const AS = require('@react-native-async-storage/async-storage').default; const { writeDurable } = require('./durable');
    try { await AS.setItem('saveDir', p.directoryUri); } catch {} try { await writeDurable('saveDir', p.directoryUri); } catch {}
    return p.directoryUri;
  } catch { return null; }
}
export const canChooseFolder = () => { try { return !!require('expo-file-system/legacy').StorageAccessFramework; } catch { return false; } };
