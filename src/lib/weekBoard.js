import AsyncStorage from '@react-native-async-storage/async-storage';
import { ui } from './motion';
import { weekId } from './kv';
// Weekly mini-league on the same free ntfy.sh room as the prediction league (topic "<room>-wk"). Each phone posts its own weekly points;
// everyone reads the latest message of every name for this week. ntfy keeps messages about 12 hours, so phones re-post every 6 hours and keep the last list they saw.
const BASE = 'https://ntfy.sh';
const timeout = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
export const roomId = async () => { try { const r = await AsyncStorage.getItem('predRoom'); return r && /^f1c-[a-z0-9]{16,40}$/.test(r) ? r : null; } catch { return null; } };
export async function syncWeek(id, name, points, days) {
  const wk = weekId(); const ck = `weekBoard:${id}:${wk}`; let players = {};
  try { players = JSON.parse((await AsyncStorage.getItem(ck)) || '{}'); } catch {}
  if (ui.offline) return { wk, players };
  const topic = `${BASE}/${id}-wk`;
  const r = await fetch(`${topic}/json?poll=1&since=all`, { signal: timeout(15000) });
  if (!r.ok) throw new Error(`Server answered ${r.status}`);
  (await r.text()).split('\n').forEach((l) => { l = l.trim(); if (!l) return; try { const e = JSON.parse(l); if (e.event !== 'message') return; const m = JSON.parse(e.message); if (m && m.n && m.w === wk && typeof m.p === 'number' && (!players[m.n] || (m.t || 0) >= (players[m.n].t || 0))) players[m.n] = { p: m.p, d: m.d || 0, t: m.t || 0 }; } catch {} });
  if (name) {
    let last = {}; try { last = JSON.parse((await AsyncStorage.getItem(`${ck}:mine`)) || '{}'); } catch {}
    const mine = players[name];
    if (!mine || mine.p !== points || Date.now() - (last.t || 0) > 6 * 3600e3) {
      const body = JSON.stringify({ n: name, w: wk, p: points, d: days, t: Date.now() });
      const pr = await fetch(topic, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, signal: timeout(15000) });
      if (pr.ok) { players[name] = { p: points, d: days, t: Date.now() }; await AsyncStorage.setItem(`${ck}:mine`, JSON.stringify({ t: Date.now() })).catch(() => {}); }
    }
  }
  await AsyncStorage.setItem(ck, JSON.stringify(players)).catch(() => {});
  return { wk, players };
}
