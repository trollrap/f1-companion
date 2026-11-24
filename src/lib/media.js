import * as M from '../data/mediaIndex';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { devPhoto } from './dev';
import { UPDATE_REPO } from '../config';
// Pictures that are not bundled in the app are listed in remote-media/index.json in the GitHub repo (made by tools/media-fetch) and downloaded the first time they are shown.
// The list is kept on the phone, so it is there instantly on the next start; the app refreshes it in the background.
const BASE = `https://raw.githubusercontent.com/${UPDATE_REPO}/main/remote-media`;
let R = { v: 0, drivers: new Set(), logos: new Set(), override: new Set() };
const take = (j) => { try { R = { v: j.v || 0, drivers: new Set(j.drivers || []), logos: new Set(j.logos || []), override: new Set(j.override || []) }; } catch {} };
const pull = async (ms) => {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const t = ctl ? setTimeout(() => ctl.abort(), ms) : null;
  try { const r = await fetch(`${BASE}/index.json?t=${Date.now()}`, ctl ? { signal: ctl.signal } : undefined); if (!r.ok) return; const j = await r.json(); take(j); AsyncStorage.setItem('media:idx', JSON.stringify(j)).catch(() => {}); } catch {} finally { if (t) clearTimeout(t); }
};
export async function loadRemoteMedia() {
  let cached = null; try { cached = JSON.parse(await AsyncStorage.getItem('media:idx')); } catch {}
  if (cached) { take(cached); pull(8000); return; } // known list: use it now, refresh quietly
  await pull(4000); // first start: wait briefly for the list
}
const remote = (kind, id) => ({ uri: `${BASE}/${kind}/${id}.png?v=${R.v}` });
// Photos are optional: every screen has a designed fallback (team gradient + big number / initials) when a file is missing.
// Looked up through the whole module so an older generated index (before principals, engineers, numbers) still works until `npm run media` is run again.
export const driverPhoto = (driverId) => devPhoto('drivers', driverId) || (M.drivers || {})[driverId] || (R.drivers.has(driverId) ? remote('drivers', driverId) : null);
export const teamCar = (teamId) => devPhoto('cars', teamId) || (M.cars || {})[teamId] || null;
export const teamLogo = (teamId) => devPhoto('logos', teamId) || (R.override.has(teamId) && R.logos.has(teamId) ? remote('logos', teamId) : null) || (M.logos || {})[teamId] || (R.logos.has(teamId) ? remote('logos', teamId) : null);
export const principalPhoto = (teamId) => devPhoto('principals', teamId) || (M.principals || {})[teamId] || null;
export const engineerPhoto = (driverId) => devPhoto('engineers', driverId) || (M.engineers || {})[driverId] || null;
export const numberImage = (driverId) => devPhoto('numbers', driverId) || (M.numbers || {})[driverId] || null;
export const appLogo = M.appLogo || null;

export const driverPhotoIds = () => Object.keys((M.drivers || {}));
