import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from './predFriends';
// A free online room without accounts: one small public JSON document on jsonblob.com. Everybody who has the room code can read and
// write it, so only share the code with friends. The document is { v: 1, players: { name: { code, t } } }.
const BASE = 'https://jsonblob.com/api/jsonBlob';
const KEY = 'predRoom';
const H = { 'Content-Type': 'application/json', Accept: 'application/json' };
const timeout = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
const okId = (s) => /^[A-Za-z0-9-]{8,60}$/.test(String(s || '').trim());
async function get(id) { const r = await fetch(`${BASE}/${id}`, { headers: H, signal: timeout(12000) }); if (!r.ok) throw new Error(r.status === 404 ? 'Room not found' : `Server answered ${r.status}`); const j = await r.json(); return j && typeof j === 'object' && j.players ? j : { v: 1, players: {} }; }
async function put(id, doc) { const r = await fetch(`${BASE}/${id}`, { method: 'PUT', headers: H, body: JSON.stringify(doc), signal: timeout(12000) }); if (!r.ok) throw new Error(`Server answered ${r.status}`); }
export async function createRoom() {
  const r = await fetch(BASE, { method: 'POST', headers: H, body: JSON.stringify({ v: 1, players: {} }), signal: timeout(12000) });
  if (!r.ok) throw new Error(`Server answered ${r.status}`);
  const loc = r.headers.get('location') || r.headers.get('Location') || ''; const id = loc.split('/').filter(Boolean).pop();
  if (!okId(id)) throw new Error('The server did not return a room code'); return id;
}
// Reads the room, adds or refreshes my entry, writes it back (a second phone writing at the same moment can overwrite once; the next sync repairs it).
export async function syncRoom(id, name, code) {
  const doc = await get(id); const players = { ...(doc.players || {}) }; const mineOld = players[name];
  if (name && code && (!mineOld || mineOld.code !== code)) { players[name] = { code, t: Date.now() }; await put(id, { v: 1, players }); }
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
  const join = useCallback(async (raw) => { const rid = String(raw || '').trim().replace(/^ROOM[:|]/i, ''); if (!okId(rid)) throw new Error('That room code does not look right'); await get(rid); await AsyncStorage.setItem(KEY, rid).catch(() => {}); setId(rid); }, []);
  const create = useCallback(async () => { const rid = await createRoom(); await AsyncStorage.setItem(KEY, rid).catch(() => {}); setId(rid); return rid; }, []);
  const leave = useCallback(async () => { await AsyncStorage.removeItem(KEY).catch(() => {}); setId(null); setMembers([]); setStatus(''); }, []);
  return { id, members, status, busy, join, create, leave, refresh: () => pull() };
}
