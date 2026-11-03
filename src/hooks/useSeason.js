import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchSeason } from '../api/season';
import { useEpoch, refreshAll } from '../lib/net';

const Ctx = createContext(null);
export function SeasonProvider({ children }) {
  const [state, setState] = useState({ status: 'loading' });
  const load = useCallback(async (quiet) => {
    if (quiet !== true) setState({ status: 'loading' });
    try { setState({ status: 'ready', ...(await fetchSeason()) }); }
    catch (e) { setState((p) => (quiet === true && p.status === 'ready' ? p : { status: 'error', error: String(e.message || e) })); }
  }, []);
  const epoch = useEpoch();
  useEffect(() => { load(); }, [load]);
  // When the race being shown as "next" ends, move on by itself (no need to reopen the app), then again a few minutes later when results are published.
  const endAt = state.status === 'ready' && state.next ? Date.parse(state.next.date_end) : 0;
  useEffect(() => {
    if (!endAt) return undefined;
    const wait = endAt - Date.now() + 60000;
    if (wait <= 0 || wait > 2147483000) return undefined;
    const a = setTimeout(() => load(true), wait), b = setTimeout(() => { refreshAll(); }, wait + 6 * 60000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [endAt, load]);
  useEffect(() => { if (epoch > 0) load(true); }, [epoch, load]);
  return <Ctx.Provider value={{ ...state, reload: () => load() }}>{children}</Ctx.Provider>;
}
export const useSeason = () => useContext(Ctx);

export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), interval); return () => clearInterval(id); }, [interval]);
  return now;
}
