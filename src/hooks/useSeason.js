import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchSeason } from '../api/season';
import { useEpoch } from '../lib/net';

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
  useEffect(() => { if (epoch > 0) load(true); }, [epoch, load]);
  return <Ctx.Provider value={{ ...state, reload: () => load() }}>{children}</Ctx.Provider>;
}
export const useSeason = () => useContext(Ctx);

export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), interval); return () => clearInterval(id); }, [interval]);
  return now;
}
