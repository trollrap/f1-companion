import { kvGet, kvSet } from './kv';
const KEY = 'savedNews', MAX = 60; let mem = null; const subs = new Set();
const pick = (x, body) => ({ id: x.id, title: x.title, link: x.link, image: x.image || null, sourceName: x.sourceName, date: x.date || null, savedAt: Date.now(), body: body || x.body || null });
export const loadSaved = async () => { if (!mem) { const v = await kvGet(KEY, []); mem = Array.isArray(v) ? v : []; } return mem; };
const put = (l) => { mem = l.slice(0, MAX); kvSet(KEY, mem); subs.forEach((f) => f(mem)); };
export const subscribeSaved = (f) => { subs.add(f); return () => subs.delete(f); };
// Saves or removes a story. `body` (the article text blocks) is kept when known, so the story can be read offline.
export async function toggleSaved(x, body) { const l = await loadSaved(); put(l.some((s) => s.id === x.id) ? l.filter((s) => s.id !== x.id) : [pick(x, body), ...l]); return !l.some((s) => s.id === x.id); }
// Adds the article text to a story that is already saved (no-op otherwise).
export async function attachBody(x, body) { const l = await loadSaved(); if (!body || !body.length || !l.some((s) => s.id === x.id && !s.body)) return; put(l.map((s) => (s.id === x.id ? { ...s, body } : s))); }
export function useSaved() { const [l, setL] = require('react').useState(mem || []); require('react').useEffect(() => { let on = true; loadSaved().then((v) => on && setL(v)); const u = subscribeSaved((v) => on && setL(v)); return () => { on = false; u(); }; }, []); return l; }
