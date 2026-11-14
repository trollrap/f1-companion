import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDriverInfo } from '../api/history';
// Words that mark a news story as being about one of the user's favourites: driver surnames and full names, team names.
const TEAM = { red_bull: ['red bull'], ferrari: ['ferrari'], mclaren: ['mclaren'], mercedes: ['mercedes'], aston_martin: ['aston martin'], alpine: ['alpine'], williams: ['williams'], haas: ['haas'], rb: ['racing bulls', 'visa cash app rb'], sauber: ['sauber', 'audi'], audi: ['audi'], cadillac: ['cadillac'], renault: ['renault'], toro_rosso: ['toro rosso'], alphatauri: ['alphatauri', 'alpha tauri'], alfa: ['alfa romeo'], force_india: ['force india'], racing_point: ['racing point'] };
const plain = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function termsFor(favs) {
  const out = new Set();
  ((favs && favs.drivers) || []).forEach((id) => {
    let name = ''; try { const i = localDriverInfo(id); if (i && i.name) name = i.name; } catch {}
    if (name) { out.add(plain(name)); const last = plain(name).split(' ').slice(-1)[0]; if (last.length >= 4) out.add(last); }
    else { const parts = String(id).split('_'); const last = plain(parts[parts.length - 1]); if (last.length >= 4) out.add(last); }
  });
  ((favs && favs.teams) || []).forEach((id) => { (TEAM[id] || [plain(String(id).replace(/_/g, ' '))]).forEach((t) => { if (t.length >= 3) out.add(t); }); });
  return [...out];
}
export async function loadFavTerms() { let f = null; try { f = JSON.parse(await AsyncStorage.getItem('favs')); } catch {} return termsFor(f); }
export const matchesFav = (x, terms) => { if (!terms.length) return false; const t = plain(`${x.title} ${x.summary || ''}`); return terms.some((w) => t.includes(w)); };
