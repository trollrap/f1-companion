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
export async function saveImage(ref) {
  lastError = '';
  if (!canShareImage() && !canSaveImage()) return 'unavailable';
  let uri;
  try { uri = await shot(ref); } catch (e) { lastError = String(e?.message || e); return 'error'; }
  if (canSaveImage()) {
    try {
      const ML = require('expo-media-library');
      let perm = await ML.getPermissionsAsync(true, ['photo']);
      if (!perm.granted) perm = await ML.requestPermissionsAsync(true, ['photo']);
      if (perm.granted) { await ML.createAssetAsync(uri); return 'ok'; }
      lastError = 'photo access not allowed';
    } catch (e) { lastError = String(e?.message || e); }
  }
  // Second way, no permission needed: write the picture into a folder the user picks once (Pictures is a good choice); the choice is remembered.
  try {
    const FS = require('expo-file-system/legacy'), SAF = FS.StorageAccessFramework, AS = require('@react-native-async-storage/async-storage').default;
    if (SAF) {
      const write = async (dir) => { const f = await SAF.createFileAsync(dir, `f1-companion-${Date.now()}`, 'image/png'); const b64 = await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 }); await FS.writeAsStringAsync(f, b64, { encoding: FS.EncodingType.Base64 }); };
      let dir = null; try { dir = await AS.getItem('saveDir'); } catch {}
      if (dir) { try { await write(dir); return 'folder'; } catch { dir = null; } }
      const p = await SAF.requestDirectoryPermissionsAsync();
      if (p.granted) { try { await AS.setItem('saveDir', p.directoryUri); } catch {} await write(p.directoryUri); return 'folder'; }
      lastError = 'no folder chosen';
    }
  } catch (e) { lastError = `${lastError} ${e?.message || e}`.trim(); }
  try { const Sharing = require('expo-sharing'); if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Save picture' }); return 'shared'; } } catch (e) { lastError = `${lastError} ${e?.message || ''}`.trim(); }
  return 'error';
}
