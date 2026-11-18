// News notifications: for every source the user switched on, tell them about new articles (at most three per check).
// Runs inside the background task of resultAlerts.js (about every 15 minutes at best, as Android allows) and when the app opens.
// Every check leaves a short record (AsyncStorage newsLog) that Settings shows, so a silent failure can be seen instead of guessed at.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOURCES, fetchFeed } from '../api/news';
import { notifyNow } from './notifications';
import { quietNow } from './quiet';
import { loadFavTerms, matchesFav } from './favNews';

const SEEN = 'newsSeen', LOG = 'newsLog';
export async function checkNews({ force = false } = {}) {
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
      const fresh = items.filter((x) => !have.has(x.id)); fresh.forEach((x) => have.add(x.id)); rec.fresh = fresh.length;
      if (first && !force) { rec.baseline = true; log.src.push(rec); continue; } // switching a source on only records what is already there
      for (const x of fresh) {
        if (rec.sent >= 3) break;
        if (x.date && Date.now() - x.date > 36 * 3600e3) continue;
        if (favOnly && !matchesFav(x, terms)) continue;
        if (await notifyNow(s.name, x.title, { item: { id: x.id, source: x.source, sourceName: x.sourceName, title: x.title, link: x.link, date: x.date, image: x.image, summary: x.summary } })) { sent++; rec.sent++; }
      }
    } catch (e) { rec.err = String((e && e.message) || e).slice(0, 90); }
    log.src.push(rec);
  }
  const all = [...have]; const bases = all.filter((k) => k.startsWith('base:')); // the per-source markers must never be trimmed away, or the source would be treated as new again and stay silent
  AsyncStorage.setItem(SEEN, JSON.stringify([...bases, ...all.filter((k) => !k.startsWith('base:')).slice(-400)])).catch(() => {});
  log.sent = sent; AsyncStorage.setItem(LOG, JSON.stringify(log)).catch(() => {});
  return sent;
}
export async function readNewsLog() { try { return JSON.parse(await AsyncStorage.getItem(LOG)); } catch { return null; } }
export async function readBgRuns() { try { const r = JSON.parse(await AsyncStorage.getItem('bgRuns')); return Array.isArray(r) ? r : []; } catch { return []; } }
