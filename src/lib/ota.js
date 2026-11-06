// Over-the-air updates (EAS Update): the app's JavaScript is downloaded from Expo in a few seconds (a few MB, not a whole .apk) and applied with a restart.
// Only works in an installed build that was made with updates configured (see UPDATES.md); in Expo Go and development it is simply off.
export const otaEnabled = () => { try { return !!require('expo-updates').isEnabled; } catch { return false; } };
// 'ready' (downloaded, restart to use), 'none' (already the newest), 'off', or 'error'.
export async function checkOta() {
  if (!otaEnabled()) return { status: 'off' };
  try {
    const U = require('expo-updates');
    const c = await U.checkForUpdateAsync();
    if (!c.isAvailable) return { status: 'none' };
    const f = await U.fetchUpdateAsync();
    return f.isNew || f.manifest ? { status: 'ready' } : { status: 'none' };
  } catch (e) { return { status: 'error', error: String(e?.message || e) }; }
}
export async function applyOta() { try { await require('expo-updates').reloadAsync(); return true; } catch { return false; } }
