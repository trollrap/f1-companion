// Restarts the app so a new accent colour is used everywhere. Returns false when this build cannot restart itself (Expo Go, development).
export async function restartApp() {
  try { const U = require('expo-updates'); await U.reloadAsync(); return true; } catch {}
  try { const { DevSettings } = require('react-native'); if (DevSettings?.reload) { DevSettings.reload(); return true; } } catch {}
  return false;
}
