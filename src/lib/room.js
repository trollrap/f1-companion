import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from './predFriends';
// A free online room without accounts, built on ntfy.sh: a "room" is just a long random topic name. Each player posts one small message
// (their name and their picks code); everyone who knows the topic reads the latest message of every name. ntfy keeps messages for about
// 12 hours, so every phone re-posts its own picks when it syncs, and the last list each phone saw is kept on that phone.
// Anyone who knows the room code can read and post, so only share it with friends.
const BASE = 'https://ntfy.sh';
const KEY = 'predRoom', CACHE = 'predRoomCache', LASTPOST = 'predRoomPosted';
const okId = (s) => /^f1c-[a-z0-9]{16,40}$/.test(String(s || '').trim());
const timeout = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
const rid = () => { const a = 'abcdefghijklmnopqrstuvwxyz0123456789'; let o = 'f1c-'; for (let i = 0; i < 20; i++) o += a[Math.floor(Math.random() * a.length)]; return o; };
export const createRoom = async () => rid();
async function readAll(id) {
  const r = await fetch(`${BASE}/${id}/json?poll=1&since=all`, { signal: timeout(15000) });
  if (!r.ok) throw new Error(`Server answered ${r.status}`);
  const txt = await r.text(); const out = {};
  txt.split('\n').forEach((l) => { l = l.trim(); if (!l) return; try { const e = JSON.parse(l); if (e.event !== 'message' || !e.message) return; const m = JSON.parse(e.message); if (m && m.n && m.c && (!out[m.n] || (m.t || 0) >= (out[m.n].t || 0))) out[m.n] = { code: m.c, t: m.t || (e.time || 0) * 1000 }; } catch {} });
  return out;
}
async function post(id, name, code) {
  const r = await fetch(`${BASE}/${id}`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ n: name, c: code, t: Date.now() }), signal: timeout(15000) });
  if (!r.ok) throw new Error(`Server answered ${r.status}`);
}
// Reads the room, posts my picks when they changed (or every 6 hours so they never expire), and returns everyone, merged with the list saved on this phone.
export async function syncRoom(id, name, code) {
  let cached = {}; try { cached = JSON.parse((await AsyncStorage.getItem(`${CACHE}:${id}`)) || '{}'); } catch {}
  const live = await readAll(id); const players = { ...cached };
  Object.keys(live).forEach((k) => { if (!players[k] || (live[k].t || 0) >= (players[k].t || 0)) players[k] = live[k]; });
  if (name && code) { const mine = live[name]; let last = {}; try { last = JSON.parse((await AsyncStorage.getItem(`${LASTPOST}:${id}`)) || '{}'); } catch {}
    if (!mine || mine.code !== code || Date.now() - (last.t || 0) > 6 * 3600 * 1000) { await post(id, name, code); players[name] = { code, t: Date.now() }; await AsyncStorage.setItem(`${LASTPOST}:${id}`, JSON.stringify({ t: Date.now() })).catch(() => {}); } }
  await AsyncStorage.setItem(`${CACHE}:${id}`, JSON.stringify(players)).catch(() => {});
  return players;
}
export function useRoom(myName, myCode) {
  const [id, setId] = useState(null); const [members, setMembers] = useState([]); const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false);
  const live = useRef({ myName, myCode }); live.current = { myName, myCode };
  useEffect(() => { AsyncStorage.getItem(KEY).then((r) => { if (r && okId(r)) setId(r); }).catch(() => {}); }, []);
  const pull = useCallback(async (rid) => {
    const use = rid || id; if (!use) return; setBusy(true);
    try { const { myName: n, myCode: c } = live.current; const pl = await syncRoom(use, n === 'Me' ? '' : n, c); setMembers(Object.entries(pl).map(([name, v]) => { const d = decode(v?.code); return d ? { name, picks: d.picks, room: true, t: v.t } : null; }).filter(Boolean)); setStatus(`Updated ${new Date().toLocaleTimeString().slice(0, 5)}`); }
    catch (e) { setStatus(String(e?.message || 'Could not reach the room').slice(0, 80)); } finally { setBusy(false); }
  }, [id]);
  useEffect(() => { if (!id) return undefined; pull(); const t = setInterval(() => pull(), 60000); return () => clearInterval(t); }, [id, pull, myCode]);
  const join = useCallback(async (raw) => { const x = String(raw || '').trim().toLowerCase(); if (!okId(x)) throw new Error('That room code does not look right. It starts with f1c-'); await AsyncStorage.setItem(KEY, x).catch(() => {}); setId(x); }, []);
  const create = useCallback(async () => { const x = await createRoom(); await AsyncStorage.setItem(KEY, x).catch(() => {}); setId(x); return x; }, []);
  const leave = useCallback(async () => { await AsyncStorage.removeItem(KEY).catch(() => {}); setId(null); setMembers([]); setStatus(''); }, []);
  return { id, members, status, busy, join, create, leave, refresh: () => pull() };
}
