// Everything in the Fun section lives on the phone: your own driver and every fantasy season. One small store shared by all Fun screens.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { AppState } from 'react-native';
import { readDurable, writeDurable } from '../lib/durable';

const KEY = 'fun:v1';
export const DEFAULT_SETTINGS = { evolve: true, transfers: 'manual', animSessions: true, animSeason: true };
const EMPTY_LIB = { drivers: [], races: [] };
let state = { profile: null, fantasies: [], settings: DEFAULT_SETTINGS, library: EMPTY_LIB }; const undoStack = {}; let lastPush = {}; let loaded = false, loading = null, timer = null; const subs = new Set();
const emit = () => subs.forEach((f) => f());
const flush = () => { if (timer) { clearTimeout(timer); timer = null; } if (!loaded) return; return writeDurable(KEY, JSON.stringify(state)); };
// Saved shortly after every change, and at once when the app goes to the background (so closing it right away loses nothing).
const persist = (now) => { if (!loaded) return; if (timer) clearTimeout(timer); if (now) { flush(); return; } timer = setTimeout(flush, 400); };
try { AppState.addEventListener('change', (st) => { if (st !== 'active') flush(); }); } catch {}
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
async function load() {
  if (loaded) return; if (loading) return loading;
  loading = (async () => { let r = null; try { r = await readDurable(KEY); } catch {} if (!r) { try { r = await AsyncStorage.getItem(KEY); } catch {} } return r; })().then((r) => { if (r) { const v = JSON.parse(r); const saved = Array.isArray(v.fantasies) ? v.fantasies : []; state = { profile: state.profile || v.profile || null, settings: { ...DEFAULT_SETTINGS, ...(v.settings || {}), ...(state.settings !== DEFAULT_SETTINGS ? state.settings : {}) }, fantasies: [...state.fantasies, ...saved.filter((x) => !state.fantasies.some((y) => y.id === x.id))], library: { drivers: [...(state.library?.drivers || []), ...((v.library?.drivers || []).filter((x) => !(state.library?.drivers || []).some((y) => y.id === x.id)))], races: [...(state.library?.races || []), ...((v.library?.races || []).filter((x) => !(state.library?.races || []).some((y) => y.id === x.id)))] } }; } }).catch(() => {}).finally(() => { loaded = true; emit(); });
  return loading;
}
export function useFun() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); subs.add(f); load(); return () => subs.delete(f); }, []);
  return {
    loaded, profile: state.profile, fantasies: state.fantasies.filter((x) => !x.preset), presets: state.fantasies.filter((x) => x.preset), library: state.library || EMPTY_LIB, settings: state.settings || DEFAULT_SETTINGS,
    setSettings: (p) => { state = { ...state, settings: { ...(state.settings || DEFAULT_SETTINGS), ...p } }; persist(true); emit(); },
    canUndo: (id) => (undoStack[id] || []).length > 0,
    undo: (id) => { const st = undoStack[id]; if (!st || !st.length) return false; const prev = st.pop(); state = { ...state, fantasies: state.fantasies.map((x) => (x.id === id ? prev : x)) }; persist(true); emit(); return true; },
    // The library: custom drivers and races kept on their own (no team, no season), ready to be added to any save or grid.
    libAdd: (kind, item) => { const l = state.library || EMPTY_LIB; state = { ...state, library: { ...l, [kind]: [item, ...l[kind]] } }; persist(true); emit(); },
    libUpdate: (kind, id, patch) => { const l = state.library || EMPTY_LIB; state = { ...state, library: { ...l, [kind]: l[kind].map((x) => (x.id === id ? { ...x, ...patch } : x)) } }; persist(); emit(); },
    libRemove: (kind, id) => { const l = state.library || EMPTY_LIB; state = { ...state, library: { ...l, [kind]: l[kind].filter((x) => x.id !== id) } }; persist(true); emit(); },
    get: (id) => state.fantasies.find((x) => x.id === id) || null,
    saveProfile: (p) => { state = { ...state, profile: p }; persist(true); emit(); },
    addFantasy: (f) => { state = { ...state, fantasies: [f, ...state.fantasies] }; persist(true); emit(); },
    // fn gets the current fantasy and returns the changed one
    // Every change can be undone (the last 25 are kept while the app is open); quick successive changes, like dragging a slider, count as one.
    update: (id, fn) => {
      const cur = state.fantasies.find((x) => x.id === id); const next = cur ? fn(cur) : null;
      if (cur && next && next !== cur) { const now = Date.now(); if (!lastPush[id] || now - lastPush[id] > 900) { const st = (undoStack[id] = undoStack[id] || []); st.push(cur); if (st.length > 25) st.shift(); } lastPush[id] = now; }
      state = { ...state, fantasies: state.fantasies.map((x) => (x.id === id ? next || x : x)) }; persist(); emit();
    },
    remove: (id) => { state = { ...state, fantasies: state.fantasies.filter((x) => x.id !== id) }; persist(true); emit(); },
  };
}

// ---- pictures: picked from the gallery, cropped square, copied into the app's own folder so they survive cache clean-ups ----
export const canPickImage = () => !!requireOptionalNativeModule('ExponentImagePicker');
export async function pickImage() {
  if (!canPickImage()) return { error: 'Picking photos needs the newest app build.' };
  try {
    const IP = require('expo-image-picker');
    const perm = await IP.requestMediaLibraryPermissionsAsync(); if (!perm.granted) return { error: 'Allow access to photos to choose a picture.' };
    const r = await IP.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (r.canceled || !r.assets?.[0]?.uri) return { cancelled: true };
    const src = r.assets[0].uri;
    try {
      const FS = require('expo-file-system/legacy'); const dir = `${FS.documentDirectory}fun/`;
      await FS.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const to = `${dir}${uid()}.jpg`; await FS.copyAsync({ from: src, to }); return { uri: to };
    } catch { return { uri: src }; }
  } catch (e) { return { error: String(e?.message || e) }; }
}
