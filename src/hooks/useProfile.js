import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Local profile only: nothing is sent anywhere. Stored: display name, avatar colour, favourite team.
// Age gate: only the RESULT is stored ('ok' or 'blocked'), never the date of birth. 'blocked' survives deleting the profile and clearing cached data,
// so going back and typing another date does not work (LEGAL.md, "Future profile feature").
const Ctx = createContext(null);
const KEY = 'profile:v1', GATE = 'profile:gate';
export function ProfileProvider({ children }) {
  const [st, setSt] = useState({ loaded: false, profile: null, gate: null });
  useEffect(() => {
    (async () => {
      let profile = null, gate = null;
      try { const p = await AsyncStorage.getItem(KEY); if (p) profile = JSON.parse(p); } catch {}
      try { const g = await AsyncStorage.getItem(GATE); if (g) gate = JSON.parse(g).state; } catch {}
      setSt({ loaded: true, profile, gate });
    })();
  }, []);
  const setGate = useCallback((gate) => { setSt((x) => ({ ...x, gate })); AsyncStorage.setItem(GATE, JSON.stringify({ state: gate, at: Date.now() })).catch(() => {}); }, []);
  const save = useCallback((p) => { const profile = { ...p, created: p.created || Date.now() }; setSt((x) => ({ ...x, profile })); AsyncStorage.setItem(KEY, JSON.stringify(profile)).catch(() => {}); }, []);
  const remove = useCallback(() => {
    setSt((x) => ({ ...x, profile: null, gate: x.gate === 'blocked' ? 'blocked' : null }));
    AsyncStorage.removeItem(KEY).catch(() => {});
    AsyncStorage.getItem(GATE).then((g) => { if (g && JSON.parse(g).state !== 'blocked') return AsyncStorage.removeItem(GATE); }).catch(() => {});
  }, []);
  return <Ctx.Provider value={{ ...st, passGate: () => setGate('ok'), blockGate: () => setGate('blocked'), save, remove }}>{children}</Ctx.Provider>;
}
export const useProfile = () => useContext(Ctx);
export const initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
