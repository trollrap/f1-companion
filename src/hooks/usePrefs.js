import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUi } from '../lib/motion';

export const SESSION_TYPES = ['Practice 1', 'Practice 2', 'Practice 3', 'Sprint Qualifying', 'Sprint', 'Qualifying', 'Race'];
export const LEADS = [[0, 'At start'], [5, '5 min'], [15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours']];
export const OPTS = { clock24: true, gap: 'leader', trackTime: false, photos: true, reduceMotion: false, padPrincipal: true, padStats: true };
const sync = (p) => setUi({ clock24: p.opts.clock24 !== false, photos: p.opts.photos !== false, reduceMotion: !!p.opts.reduceMotion });
const DEFAULT = { opts: OPTS, results: false, leads: [15], types: { 'Practice 1': false, 'Practice 2': false, 'Practice 3': false, 'Sprint Qualifying': true, Sprint: true, Qualifying: true, Race: true } };

const Ctx = createContext(null);
export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULT);
  useEffect(() => {
    AsyncStorage.getItem('prefs').then((r) => {
      if (!r) return; const v = JSON.parse(r);
      const leads = Array.isArray(v.leads) && v.leads.length ? v.leads : typeof v.lead === 'number' ? [v.lead] : DEFAULT.leads; // older versions stored one lead time
      const n = { ...DEFAULT, opts: { ...OPTS, ...(v.opts || {}) }, results: !!v.results, types: { ...DEFAULT.types, ...v.types }, leads: leads.filter((m) => m !== 1440).length ? leads.filter((m) => m !== 1440) : DEFAULT.leads }; // (the 1-day option was removed)
      sync(n); setPrefs(n);
    }).catch(() => {});
  }, []);
  const save = useCallback((n) => { sync(n); setPrefs(n); AsyncStorage.setItem('prefs', JSON.stringify(n)).catch(() => {}); }, []);
  const api = {
    prefs,
    toggleLead: (m) => { const has = prefs.leads.includes(m); if (has && prefs.leads.length === 1) return; save({ ...prefs, leads: (has ? prefs.leads.filter((x) => x !== m) : [...prefs.leads, m]).sort((a, b) => a - b) }); },
    setOpt: (k, val) => save({ ...prefs, opts: { ...prefs.opts, [k]: val } }),
    toggleResults: () => save({ ...prefs, results: !prefs.results }),
    toggle: (t) => save({ ...prefs, types: { ...prefs.types, [t]: !prefs.types[t] } }),
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export const usePrefs = () => useContext(Ctx);
