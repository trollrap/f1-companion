import { setLang } from '../lib/i18n';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUi } from '../lib/motion';
import { readDurable, writeDurable } from '../lib/durable';

export const SESSION_TYPES = ['Practice 1', 'Practice 2', 'Practice 3', 'Sprint Qualifying', 'Sprint', 'Qualifying', 'Race'];
export const LEADS = [[0, 'At start'], [5, '5 min'], [15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours']];
export const OPTS = { clock24: true, gap: 'leader', trackTime: false, photos: true, reduceMotion: false, padPrincipal: true, padStats: true, pullRefresh: false, lang: 'en', sport: 'f1', homeFirst: 'drivers', accent: null, name: '', welcomed: false };
const sync = (p) => { setLang(p.opts.lang === 'el' ? 'el' : 'en'); setUi({ clock24: p.opts.clock24 !== false, photos: p.opts.photos !== false, reduceMotion: !!p.opts.reduceMotion, lang: p.opts.lang === 'el' ? 'el' : 'en' }); };
const DEFAULT = { opts: OPTS, results: false, leads: [15], types: { 'Practice 1': false, 'Practice 2': false, 'Practice 3': false, 'Sprint Qualifying': true, Sprint: true, Qualifying: true, Race: true } };

const Ctx = createContext(null);
export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULT); const [ready, setReady] = useState(false); const cur = useRef(DEFAULT); const chain = useRef(Promise.resolve());
  const loadDone = useRef(null); const loadedFlag = useRef(false); if (!loadDone.current) loadDone.current = new Promise((res) => { loadDone.resolve = res; });
  useEffect(() => {
    Promise.all([AsyncStorage.getItem('prefs'), readDurable('welcomed'), readDurable('accent'), readDurable('prefs:v2')]).then(([raw, wel, acc, dur]) => {
      let r = raw; try { if (dur) { const d = JSON.parse(dur); const m = raw ? JSON.parse(raw) : null; if (!m || (d.t || 0) >= (m.t || 0)) r = JSON.stringify(d); } } catch {}
      // "welcomed" and the accent colour also live under their own small keys, so they survive however the main prefs were last written
      const v = r ? JSON.parse(r) : {}; v.opts = { ...(v.opts || {}) };
      if (wel === '1') v.opts.welcomed = true; if (acc && !v.opts.accent) v.opts.accent = acc;
      const leads = Array.isArray(v.leads) && v.leads.length ? v.leads : typeof v.lead === 'number' ? [v.lead] : DEFAULT.leads; // older versions stored one lead time
      const n = { ...DEFAULT, opts: { ...OPTS, ...(v.opts || {}) }, results: !!v.results, types: { ...DEFAULT.types, ...v.types }, leads: leads.filter((m) => m !== 1440).length ? leads.filter((m) => m !== 1440) : DEFAULT.leads }; // (the 1-day option was removed)
      cur.current = n; sync(n); setPrefs(n);
    }).catch(() => {}).finally(() => { loadedFlag.current = true; loadDone.resolve && loadDone.resolve(); setReady(true); });
  }, []);
  // Writes are confirmed before anything (such as an app restart) depends on them: one retry, then read back.
  // Changes are applied to the latest state (not the one from the last render), so quick successive changes are not lost.
  const save = useCallback(function save(fn) {
    // A change made before the saved settings were read would be built on the defaults and wipe the saved accent colour and options: it waits for the load first.
    if (!loadedFlag.current) return loadDone.current.then(() => save(fn));
    const n = { ...fn(cur.current), t: Date.now() }; cur.current = n; sync(n); setPrefs(n);
    const str = JSON.stringify(n);
    const put = async (k, v) => { for (let i = 0; i < 2; i++) { try { await AsyncStorage.setItem(k, v); if ((await AsyncStorage.getItem(k)) === v) return true; } catch {} } return false; };
    const job = async () => { const ok = await put('prefs', str); await writeDurable('prefs:v2', str); if (n.opts.welcomed) await writeDurable('welcomed', '1'); await writeDurable('accent', n.opts.accent || ''); return ok; };
    const p = chain.current.then(job, job); chain.current = p.catch(() => {}); return p;
  }, []);
  const api = {
    prefs, ready,
    toggleLead: (m) => { const has = prefs.leads.includes(m); if (has && prefs.leads.length === 1) return; save((p) => ({ ...p, leads: (p.leads.includes(m) ? p.leads.filter((x) => x !== m) : [...p.leads, m]).sort((a, b) => a - b) })); },
    setOpt: (k, val) => save((p) => ({ ...p, opts: { ...p.opts, [k]: val } })),
    setOpts: (o) => save((p) => ({ ...p, opts: { ...p.opts, ...o } })),
    toggleResults: () => save((p) => ({ ...p, results: !p.results })),
    toggle: (t) => save((p) => ({ ...p, types: { ...p.types, [t]: !p.types[t] } })),
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export const usePrefs = () => useContext(Ctx);
