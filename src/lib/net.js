import { useEffect, useState } from 'react';
// Tiny shared store for pull-to-refresh and the offline banner. No native module needed.
// - refreshAll(): marks short-lived cached data as stale and tells every screen to reload quietly (old data stays on screen).
// - offline flips on after two network failures in a row and off again at the first success, so one slow call never flashes the banner.
const subs = new Set();
const st = { epoch: 0, offline: false, fails: 0, pending: 0, bustAt: 0 };
const emit = () => subs.forEach((f) => f());

export const bustAt = () => st.bustAt;
// Background refresh brought new data: tell screens to reload quietly from the cache (coalesced).
let dcTimer = null;
export function dataChanged() { if (dcTimer) return; dcTimer = setTimeout(() => { dcTimer = null; st.epoch++; emit(); }, 600); }
export function netOk() { st.fails = 0; if (st.offline) { st.offline = false; emit(); } }
export function netFail() { st.fails++; if (st.fails >= 2 && !st.offline) { st.offline = true; emit(); } }
export function track(p) { st.pending++; const done = () => { st.pending--; }; p.then(done, done); return p; }

// Resolves when the reload has settled: at least 0.7 s (so the spinner is seen) and at most 8 s.
export function refreshAll() {
  st.bustAt = Date.now(); st.epoch++; emit();
  const t0 = Date.now();
  return new Promise((res) => {
    const tick = () => { const el = Date.now() - t0; if ((el > 700 && st.pending === 0) || el > 8000) res(); else setTimeout(tick, 150); };
    setTimeout(tick, 150);
  });
}
function useStore(sel) {
  const [v, set] = useState(sel);
  useEffect(() => { const f = () => set(sel()); subs.add(f); f(); return () => { subs.delete(f); }; }, []);
  return v;
}
export const useEpoch = () => useStore(() => st.epoch);
export const useOffline = () => useStore(() => st.offline);
