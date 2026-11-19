// News notifications: for every source the user switched on, tell them about new articles (at most three per check).
// Runs inside the background task of resultAlerts.js (about every 15 minutes at best, as Android allows) and when the app opens.
// Every check leaves a short record (AsyncStorage newsLog) that Settings shows, so a silent failure can be seen instead of guessed at.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOURCES, fetchFeed } from '../api/news';
import { notifyNow } from './notifications';
import { quietNow } from './quiet';
import { loadFavTerms, matchesFav } from './favNews';

const SEEN = 'newsSeen', LOG = 'newsLog';
// Only one check runs at a time (the background task and the app can both start one). Callers that arrive meanwhile share the result.
let running = null;
export function checkNews(opts = {}) { if (running) return running; running = checkNewsOnce(opts).finally(() => { running = null; }); return running; }
// A story counts as already told when its id or its address without any tracking query was recorded, so a feed that changes its ids cannot repeat it.
const keyOf = (x) => `u:${String(x.link || x.title || x.id).split('?')[0].split('#')[0].toLowerCase()}`;
async function saveSeen(have) {
  const all = [...have]; const bases = all.filter((k) => k.startsWith('base:')); // the per-source markers must never be trimmed away, or the source would be treated as new again
  await AsyncStorage.setItem(SEEN, JSON.stringify([...bases, ...all.filter((k) => !k.startsWith('base:')).slice(-600)])).catch(() => {});
}
async function checkNewsOnce({ force = false } = {}) {
  let prefs = {}; try { prefs = JSON.parse(await AsyncStorage.getItem('prefs')) || {}; } catch {}
  const on = prefs.opts?.newsAlerts || {}; const ids = Object.keys(on).filter((k) => on[k]); if (!ids.length) return 0;
  const favOnly = !!prefs.opts?.newsFavOnly; const terms = favOnly ? await loadFavTerms() : [];
  let seen = null; try { seen = JSON.parse(await AsyncStorage.getItem(SEEN)); } catch {}
  const have = new Set(Array.isArray(seen) ? seen : []); let sent = 0; const log = { t: Date.now(), force, favOnly, quiet: false, src: [] };
  try { log.quiet = !!(await quietNow()); } catch {}
  for (const s of SOURCES.filter((x) => ids.includes(x.id))) {
    const rec = { name: s.name, ok: false, count: 0, fresh: 0, sent: 0, baseline: false, err: '' };
    try {
      const items = (await fetchFeed(s, { fresh: true })).slice(0, 10); const key = `base:${s.id}`; rec.ok = true; rec.count = items.length;
      const first = !have.has(key); have.add(key);
      const fresh = items.filter((x) => !have.has(x.id) && !have.has(keyOf(x))); fresh.forEach((x) => { have.add(x.id); have.add(keyOf(x)); }); rec.fresh = fresh.length;
      await saveSeen(have); // saved before anything is sent, so a stopped background task can never tell the same story again
      if (first && !force) { rec.baseline = true; log.src.push(rec); continue; } // switching a source on only records what is already there
      for (const x of fresh) {
        if (rec.sent >= 2 || sent >= 3) break;
        if (x.date && Date.now() - x.date > 36 * 3600e3) continue;
        if (favOnly && !matchesFav(x, terms)) continue;
        if (await notifyNow(s.name, x.title, { item: { id: x.id, source: x.source, sourceName: x.sourceName, title: x.title, link: x.link, date: x.date, image: x.image, summary: x.summary } })) { sent++; rec.sent++; }
      }
    } catch (e) { rec.err = String((e && e.message) || e).slice(0, 90); }
    log.src.push(rec);
  }
  await saveSeen(have);
  log.sent = sent; await AsyncStorage.setItem(LOG, JSON.stringify(log)).catch(() => {});
  return sent;
}
export async function readNewsLog() { try { return JSON.parse(await AsyncStorage.getItem(LOG)); } catch { return null; } }
export async function readBgRuns() { try { const r = JSON.parse(await AsyncStorage.getItem('bgRuns')); return Array.isArray(r) ? r : []; } catch { return []; } }
