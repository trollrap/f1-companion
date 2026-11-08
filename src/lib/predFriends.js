import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Friends' predictions, pasted in as a code. A code is plain text: F1P|name|round:pole:p1:p2:p3;round:... (Jolpica driver ids), so it can be sent in any chat.
const KEY = 'predFriends';
const clean = (s) => String(s || '').replace(/[|;:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24);
export function encode(name, all) {
  const rows = Object.keys(all || {}).sort((a, b) => a - b).filter((r) => all[r] && (all[r].pole || (all[r].podium || []).some(Boolean)))
    .map((r) => `${r}:${all[r].pole || ''}:${(all[r].podium || []).concat([null, null, null]).slice(0, 3).map((x) => x || '').join(':')}`);
  return `F1P|${clean(name) || 'Me'}|${rows.join(';')}`;
}
export function decode(code) {
  const parts = String(code || '').trim().split('|'); if (parts[0] !== 'F1P' || parts.length < 3) return null;
  const picks = {};
  parts[2].split(';').filter(Boolean).forEach((s) => { const [r, pole, a, b, c] = s.split(':'); const n = Number(r); if (n > 0) picks[n] = { pole: pole || null, podium: [a || null, b || null, c || null] }; });
  return Object.keys(picks).length ? { name: clean(parts[1]) || 'Friend', picks } : null;
}
export function useFriends() {
  const [list, setList] = useState([]);
  useEffect(() => { AsyncStorage.getItem(KEY).then((r) => { if (r) { try { setList(JSON.parse(r)); } catch {} } }).catch(() => {}); }, []);
  const save = useCallback((fn) => setList((p) => { const n = fn(p); AsyncStorage.setItem(KEY, JSON.stringify(n)).catch(() => {}); return n; }), []);
  // Adding a friend who is already there (same name) replaces their picks, so pasting a newer code updates them.
  const add = useCallback((f) => save((p) => [...p.filter((x) => x.name.toLowerCase() !== f.name.toLowerCase()), f]), [save]);
  const remove = useCallback((name) => save((p) => p.filter((x) => x.name !== name)), [save]);
  return { list, add, remove };
}
