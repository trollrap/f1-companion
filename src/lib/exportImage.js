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
export async function saveImage(ref) {
  if (!canSaveImage()) return 'unavailable';
  try { const ML = require('expo-media-library'); const perm = await ML.requestPermissionsAsync(true); if (!perm.granted) return 'denied'; await ML.saveToLibraryAsync(await shot(ref)); return 'ok'; } catch { return 'error'; }
}
