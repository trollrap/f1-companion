// News notifications: for every source the user switched on, tell them about new articles (at most three per check).
// Runs inside the background task of resultAlerts.js (about every 15 minutes at best, as Android allows) and when the app opens.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOURCES, fetchFeed } from '../api/news';
import { notifyNow } from './notifications';

const SEEN = 'newsSeen';
export async function checkNews({ force = false } = {}) {
  let prefs = {}; try { prefs = JSON.parse(await AsyncStorage.getItem('prefs')) || {}; } catch {}
  const on = prefs.opts?.newsAlerts || {}; const ids = Object.keys(on).filter((k) => on[k]); if (!ids.length) return 0;
  let seen = null; try { seen = JSON.parse(await AsyncStorage.getItem(SEEN)); } catch {}
  const have = new Set(Array.isArray(seen) ? seen : []); let sent = 0;
  for (const s of SOURCES.filter((x) => ids.includes(x.id))) {
    try {
      const items = (await fetchFeed(s, { fresh: true })).slice(0, 10); const key = `base:${s.id}`;
      const first = !have.has(key); have.add(key);
      const fresh = items.filter((x) => !have.has(x.id)); fresh.forEach((x) => have.add(x.id));
      if (first && !force) continue; // switching a source on only records what is already there
      for (const x of fresh.slice(0, 3)) { if (Date.now() - x.date > 36 * 3600e3 && x.date) continue; if (await notifyNow(s.name, x.title)) sent++; }
    } catch {}
  }
  AsyncStorage.setItem(SEEN, JSON.stringify([...have].slice(-300))).catch(() => {});
  return sent;
}
