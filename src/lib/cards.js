import AsyncStorage from '@react-native-async-storage/async-storage';
import { localAllDrivers, localCareer, localDriverInfo, lastTeamOf } from '../api/history';
import { driverChampionYears } from '../data/champions';

// Collectible driver cards. Packs of 3 are earned by playing (quiz, mystery driver, circuit clues, lights-out); each card is a real driver from the
// offline history and its rarity comes from the career: legendary = world champion, epic = 10+ wins, rare = a win or 3 podiums, otherwise common.
const KEY = 'cards:v1';
export const RARITY = { common: { label: 'Common', color: '#9AA3AE', odds: 0.5 }, rare: { label: 'Rare', color: '#3B9CFF', odds: 0.32 }, epic: { label: 'Epic', color: '#B65CFF', odds: 0.14 }, legendary: { label: 'Legendary', color: '#F5B301', odds: 0.04 } };
export const ORDER = ['legendary', 'epic', 'rare', 'common'];
let mem = null, subs = new Set(), POOL = null;
const blank = () => ({ owned: {}, packs: 2, keys: {}, opened: 0 }); // two starter packs
export async function loadCards() { if (mem) return mem; try { const r = await AsyncStorage.getItem(KEY); mem = r ? { ...blank(), ...JSON.parse(r) } : blank(); } catch { mem = blank(); } if (!(await AsyncStorage.getItem(KEY).catch(() => 'x'))) save(); return mem; }
function save() { subs.forEach((f) => f(mem)); AsyncStorage.setItem(KEY, JSON.stringify(mem)).catch(() => {}); }
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export function cardOf(id) {
  const info = localDriverInfo(id), c = localCareer(id); if (!info || !c) return null; let titles = 0; try { titles = driverChampionYears(id).length; } catch {}
  const rarity = titles > 0 ? 'legendary' : c.wins >= 10 ? 'epic' : c.wins >= 1 || c.podiums >= 3 ? 'rare' : 'common'; const t = lastTeamOf(id);
  return { id, name: info.name, nationality: info.nationality, number: info.number, code: info.code, races: c.races, wins: c.wins, podiums: c.podiums, poles: c.poles, titles, first: c.first, last: c.last, rarity, teamId: t?.teamId, team: t?.team };
}
// Earn a pack once per key (for example "mystery:2026-11-10"), so a game can only pay out once a day.
export async function awardPack(key, n = 1) { const m = await loadCards(); if (m.keys[key]) return false; m.keys[key] = 1; m.packs += n; const ks = Object.keys(m.keys); if (ks.length > 300) ks.slice(0, 100).forEach((k) => delete m.keys[k]); save(); return true; }
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
function roll(r = Math.random) { let x = r(), acc = 0; for (const k of ['legendary', 'epic', 'rare']) { acc += RARITY[k].odds; if (x < acc) return k; } return 'common'; }
export async function openPack() {
  const m = await loadCards(); if (m.packs < 1) return null; if (!POOL) POOL = localAllDrivers().filter((d) => (d.first_year || 9999) >= 1950);
  const out = [];
  for (let n = 0; n < 3; n++) { const want = roll(); let card = null;
    for (let t = 0; t < 70 && !card; t++) { const d = pick(POOL); if (want === 'legendary' && t < 60 && !(driverChampionYears(d.driverId).length)) { if (t % 3 !== 2) continue; } const c = cardOf(d.driverId); if (c && (c.rarity === want || t > 60)) card = c; }
    if (!card) { const c = cardOf(pick(POOL).driverId); card = c || out[0]; } if (card) out.push(card); }
  m.packs -= 1; m.opened += 1; out.forEach((c) => { m.owned[c.id] = (m.owned[c.id] || 0) + 1; }); save(); return out;
}
