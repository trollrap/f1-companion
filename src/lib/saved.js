import AsyncStorage from '@react-native-async-storage/async-storage';
// Saved stories. Every change is read from and written to storage (awaited), so nothing depends on a copy held in memory and a save can never be lost.
const KEY = 'savedNews', MAX = 80; let mem = []; const subs = new Set();
const idOf = (x) => String(x.id || x.link || x.title);
const pick = (x, body) => ({ id: idOf(x), title: x.title, link: x.link || null, image: x.image || null, sourceName: x.sourceName || '', source: x.source || null, date: x.date || null, summary: x.summary || '', savedAt: Date.now(), body: body || x.body || null });
const read = async () => { try { const r = JSON.parse(await AsyncStorage.getItem(KEY)); return Array.isArray(r) ? r : []; } catch { return []; } };
const put = async (l) => { mem = l.slice(0, MAX); try { await AsyncStorage.setItem(KEY, JSON.stringify(mem)); } catch {} subs.forEach((f) => f(mem)); };
export const loadSaved = async () => { mem = await read(); return mem; };
export const subscribeSaved = (f) => { subs.add(f); return () => subs.delete(f); };
let chain = Promise.resolve(); // changes run one after another, so two quick taps cannot overwrite each other
const queue = (fn) => { const r = chain.then(fn); chain = r.catch(() => {}); return r; };
// Saves or removes a story. `body` (the article text blocks) is kept when known, so the story can be read offline. Returns true when it is now saved.
export const toggleSaved = (x, body) => queue(async () => { const l = await read(); const id = idOf(x), has = l.some((s) => s.id === id); await put(has ? l.filter((s) => s.id !== id) : [pick(x, body), ...l]); return !has; });
// Adds the article text to a story that is already saved (no-op otherwise).
export const attachBody = (x, body) => queue(async () => { const l = await read(); const id = idOf(x); if (!body || !body.length || !l.some((s) => s.id === id && !s.body)) return; await put(l.map((s) => (s.id === id ? { ...s, body } : s))); });
export function useSaved() { const R = require('react'); const [l, setL] = R.useState(mem); R.useEffect(() => { let on = true; loadSaved().then((v) => on && setL(v)); const u = subscribeSaved((v) => on && setL(v)); return () => { on = false; u(); }; }, []); return l; }
