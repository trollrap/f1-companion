import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { paddockMeta } from '../api/paddock';
import { setLiveTeamColors, teamColor } from '../theme';
import { YEAR } from '../api/openf1';

// Loads current driver numbers and team colours once. Components call useTeamColor() so they redraw when the colours arrive.
const Ctx = createContext({ meta: null, v: 0 });
export function TeamsProvider({ children }) {
  const [st, setSt] = useState({ meta: null, v: 0 });
  useEffect(() => {
    let dead = false;
    paddockMeta(YEAR).then((meta) => { if (dead) return; setLiveTeamColors(meta.teamColors); setSt({ meta, v: 1 }); }).catch(() => {});
    return () => { dead = true; };
  }, []);
  return <Ctx.Provider value={st}>{children}</Ctx.Provider>;
}
export function useTeamColor() { useContext(Ctx); return useCallback((id) => teamColor(id), []); } // subscribes; the function itself reads the live map
export const usePaddockMeta = () => useContext(Ctx).meta;
