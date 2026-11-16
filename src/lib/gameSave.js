import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from './dialog';
import { kvGet, kvSet } from './kv';


// Persists a whole game state under game:<key>. `make()` builds a fresh state; a finished game (state.over) is not resumed.
// Returns [state, update(patchOrFn), restart, ready]. A ref always holds the latest state so timers never read stale values.
export function useGameSave(key, make) {
  const [g, setG] = useState(null); const ref = useRef(null); const alive = useRef(true);
  const put = useCallback((n) => { ref.current = n; if (alive.current) setG(n); kvSet(`game:${key}`, { g: n }); }, [key]);
  useEffect(() => { alive.current = true; let off = false;
    kvGet(`game:${key}`, null).then((s) => { if (off) return; let n = null; try { n = s?.g && !s.g.over ? s.g : make(); } catch { n = null; } ref.current = n; setG(n); });
    return () => { off = true; alive.current = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = useCallback((p) => { const cur = ref.current; if (!cur) return; put({ ...cur, ...(typeof p === 'function' ? p(cur) : p) }); }, [put]);
  const restart = useCallback(() => { let n = null; try { n = make(); } catch { n = null; } put(n || {}); }, [put]); // eslint-disable-line react-hooks/exhaustive-deps
  return [g, update, restart, ref];
}

// Asks before leaving while `active` is true. Progress is already saved by useGameSave.
export function useLeaveGuard(active) {
  const nav = useNavigation(); const on = useRef(active); on.current = active;
  useEffect(() => nav.addListener('beforeRemove', (e) => {
    if (!on.current) return; e.preventDefault();
    Alert.alert('Leave the game?', 'Your progress is saved, so you can pick up where you left off.', [{ text: 'Stay', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: () => nav.dispatch(e.data.action) }]);
  }), [nav]);
}

// setTimeout that is cleared when the screen goes away.
export function useTimers() {
  const ids = useRef([]); useEffect(() => () => ids.current.forEach(clearTimeout), []);
  return useCallback((fn, ms) => { const id = setTimeout(fn, ms); ids.current.push(id); return id; }, []);
}

// Round-based games: persists { seed, i, score } so a quit game resumes with the same rounds (rounds are built from `seed`).
export function useRun(key) {
  const [g, upd, restart] = useGameSave(`run:${key}`, () => ({ seed: Date.now(), i: 0, score: 0 }));
  const val = (v, cur) => (typeof v === 'function' ? v(cur) : v);
  return {
    ready: !!g, seed: g?.seed ?? 0, i: g?.i || 0, score: g?.score || 0,
    setI: (v) => upd((c) => ({ i: val(v, c.i || 0) })), setScore: (v) => upd((c) => ({ score: val(v, c.score || 0) })),
    finish: () => upd({ over: true }), again: restart,
  };
}
