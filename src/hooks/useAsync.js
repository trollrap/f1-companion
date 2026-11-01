import { useCallback, useEffect, useRef, useState } from 'react';
import { useEpoch } from '../lib/net';
// Runs `fn` when `deps` change. State is { loading } | { v } | { error }, plus reload().
// A pull-to-refresh reloads quietly: the old value stays on screen and is replaced when the new one arrives.
export function useAsync(fn, deps = []) {
  const [st, set] = useState({ loading: true }); const [n, setN] = useState(0);
  const epoch = useEpoch(), seen = useRef(epoch), soft = useRef(false);
  useEffect(() => { if (epoch !== seen.current) { seen.current = epoch; soft.current = true; setN((x) => x + 1); } }, [epoch]);
  useEffect(() => {
    let dead = false; const quiet = soft.current; soft.current = false;
    if (!quiet) set({ loading: true });
    fn().then((v) => !dead && set({ v })).catch((e) => !dead && set((p) => (quiet && p.v !== undefined ? p : { error: String(e.message || e) })));
    return () => { dead = true; };
  }, [...deps, n]);
  const reload = useCallback(() => setN((x) => x + 1), []);
  return { ...st, reload };
}
