// Everything in the Fun section lives on the phone: your own driver and every fantasy season. One small store shared by all Fun screens.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';

const KEY = 'fun:v1';
let state = { profile: null, fantasies: [] }; let loaded = false, loading = null, timer = null; const subs = new Set();
const emit = () => subs.forEach((f) => f());
const persist = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}), 250); };
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
async function load() {
  if (loaded) return; if (loading) return loading;
  loading = AsyncStorage.getItem(KEY).then((r) => { if (r) { const v = JSON.parse(r); state = { profile: v.profile || null, fantasies: Array.isArray(v.fantasies) ? v.fantasies : [] }; } }).catch(() => {}).finally(() => { loaded = true; emit(); });
  return loading;
}
export function useFun() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); subs.add(f); load(); return () => subs.delete(f); }, []);
  return {
    loaded, profile: state.profile, fantasies: state.fantasies,
    get: (id) => state.fantasies.find((x) => x.id === id) || null,
    saveProfile: (p) => { state = { ...state, profile: p }; persist(); emit(); },
    addFantasy: (f) => { state = { ...state, fantasies: [f, ...state.fantasies] }; persist(); emit(); },
    // fn gets the current fantasy and returns the changed one
    update: (id, fn) => { state = { ...state, fantasies: state.fantasies.map((x) => (x.id === id ? fn(x) : x)) }; persist(); emit(); },
    remove: (id) => { state = { ...state, fantasies: state.fantasies.filter((x) => x.id !== id) }; persist(); emit(); },
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
