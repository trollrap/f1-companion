// Developer overrides (secret menu). Two layers: `perm` is saved on the phone and loaded at start-up, `temp` lives in memory until the app closes.
// Photos (driver / car / logo / principal), team colours and theme colours can be overridden; screens read them through media.js and theme.js.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, devTeamColors } from '../theme';
const KEY = 'dev:ov';
const empty = () => ({ photos: { drivers: {}, cars: {}, logos: {}, principals: {}, engineers: {}, numbers: {} }, teamColors: {}, colors: {} });
let perm = empty(), temp = empty();
const merge = (a, b) => ({ photos: Object.fromEntries(Object.keys(a.photos).map((k) => [k, { ...a.photos[k], ...(b.photos?.[k] || {}) }])), teamColors: { ...a.teamColors, ...(b.teamColors || {}) }, colors: { ...a.colors, ...(b.colors || {}) } });
let all = merge(perm, temp);
const rebuild = () => { all = merge(perm, temp); Object.keys(devTeamColors).forEach((k) => delete devTeamColors[k]); Object.assign(devTeamColors, all.teamColors); };
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(perm)).catch(() => {});
export async function loadDev() {
  try { const r = await AsyncStorage.getItem(KEY); if (r) { const j = JSON.parse(r); const e = empty(); perm = { photos: { ...e.photos, ...(j.photos || {}) }, teamColors: j.teamColors || {}, colors: j.colors || {} }; } } catch {}
  rebuild(); applyColors();
}
export function applyColors() { Object.keys(all.colors).forEach((k) => { if (/^#[0-9a-f]{6}$/i.test(all.colors[k])) colors[k] = all.colors[k]; }); }
export const devPhoto = (kind, id) => { const u = all.photos[kind]?.[id]; return u ? { uri: u } : null; };
export const devSnapshot = () => ({ perm, temp, all });
// kind: 'photos.drivers' | 'teamColors' | 'colors'
export function devSet(kind, id, value, persist) {
  const layer = persist ? perm : temp; const [a, b] = kind.split('.');
  if (b) layer[a][b] = { ...layer[a][b], [id]: value }; else layer[a] = { ...layer[a], [id]: value };
  rebuild(); applyColors(); if (persist) return save(); return Promise.resolve();
}
export function devClear(kind, id) {
  [perm, temp].forEach((layer) => { const [a, b] = kind.split('.'); if (b) { const { [id]: _x, ...rest } = layer[a][b]; layer[a][b] = rest; } else { const { [id]: _y, ...rest } = layer[a]; layer[a] = rest; } });
  rebuild(); return save();
}
export async function devResetAll() { perm = empty(); temp = empty(); rebuild(); await AsyncStorage.removeItem(KEY).catch(() => {}); }
