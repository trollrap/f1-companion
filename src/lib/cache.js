import AsyncStorage from '@react-native-async-storage/async-storage';
import { bustAt, netOk, netFail, track, dataChanged } from './net';
// Limits: OpenF1 free tier 3 req/s and 30 req/min. Jolpica 4 req/s and 500 req/hour (maintainer, GitHub discussion #80).
// So: every call is cached, calls go through one throttled queue per host, and 429s are retried with backoff.
export const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;
// Requests to one host start at least `gap` ms apart and up to `conc` can be in flight at once, so a slow server (several seconds
// per call) no longer makes every screen wait in one long line.
const GAPS = { 'api.jolpi.ca': [260, 4], 'api.openf1.org': [400, 2] };
const hosts = new Map();
function pump(h) {
  while (h.active < h.conc && h.q.length) {
    const wait = h.last + h.gap - Date.now();
    if (wait > 0) { if (!h.timer) h.timer = setTimeout(() => { h.timer = null; pump(h); }, wait); return; }
    const job = h.q.shift(); h.last = Date.now(); h.active++;
    job.fn().then(job.resolve, job.reject).finally(() => { h.active--; pump(h); });
  }
}
function throttled(url, fn) {
  const host = new URL(url).host; let h = hosts.get(host);
  if (!h) { const [gap, conc] = GAPS[host] || [300, 3]; h = { gap, conc, last: 0, active: 0, q: [], timer: null }; hosts.set(host, h); }
  return new Promise((resolve, reject) => { h.q.push({ fn, resolve, reject }); pump(h); });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchRetry(url, signal) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(url, { signal });
    if (r.status === 429 && attempt < 4) { await sleep(1500 * attempt); continue; }
    return r;
  }
}
const inflight = new Map();
function refresh(url, key, stale, signal, trackIt = true) {
  if (inflight.has(url)) return inflight.get(url);
  const p = throttled(url, async () => {
    const ctrl = signal ? null : new AbortController(); const timer = ctrl && setTimeout(() => ctrl.abort(), 15000);
    try {
      let r;
      try { r = await fetchRetry(url, signal || ctrl.signal); } catch (e) { netFail(); throw e; }
      netOk(); // the server answered, so the device is online even if the answer is an error
      if (!r.ok) { if (stale) return stale; throw new Error(`HTTP ${r.status}`); } // serve stale data on error
      const v = await r.json();
      AsyncStorage.setItem(key, JSON.stringify({ t: Date.now(), v })).catch(() => {});
      return v;
    } catch (e) { if (stale) return stale; throw e; } finally { if (timer) clearTimeout(timer); }
  }).finally(() => inflight.delete(url));
  inflight.set(url, trackIt ? track(p) : p);
  return p;
}
const MAX_STALE = 60 * DAY;
// Stale-while-revalidate: old data is shown straight away and refreshed in the background (screens then update quietly).
// Only a pull-to-refresh makes short-lived data wait for the network.
export async function cachedJSON(url, ttlMs, { signal } = {}) {
  const key = 'c:' + url;
  let stale = null, staleOk = false;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const { t, v } = JSON.parse(raw); const busted = ttlMs <= HOUR && t < bustAt(), age = Date.now() - t;
      if (age < ttlMs && !busted) return v;
      stale = v; staleOk = !busted && age < MAX_STALE;
    }
  } catch {}
  if (staleOk) {
    const before = JSON.stringify(stale);
    refresh(url, key, stale, undefined, false).then((v) => { if (JSON.stringify(v) !== before) dataChanged(); }).catch(() => {});
    return stale;
  }
  return refresh(url, key, stale, signal);
}
// Uncached request for diagnostics. Returns { status, json, ms }.
export function liveJSON(url) {
  return throttled(url, async () => {
    const t0 = Date.now(); const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 9000);
    try { const r = await fetch(url, { signal: ctrl.signal }); let json = null; try { json = await r.json(); } catch {} return { status: r.status, json, ms: Date.now() - t0 }; }
    finally { clearTimeout(timer); }
  });
}
// Caches a computed value (not a URL) in AsyncStorage and shares one in-flight computation between callers.
const memoInflight = new Map();
export async function memo(key, ttlMs, fn) {
  const k = 'c:memo:' + key;
  try { const raw = await AsyncStorage.getItem(k); if (raw) { const { t, v } = JSON.parse(raw); if (Date.now() - t < ttlMs) return v; } } catch {}
  if (memoInflight.has(k)) return memoInflight.get(k);
  const p = fn().then((v) => { AsyncStorage.setItem(k, JSON.stringify({ t: Date.now(), v })).catch(() => {}); return v; }).finally(() => memoInflight.delete(k));
  memoInflight.set(k, p); return p;
}
export async function clearCache() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('c:'));
  if (keys.length) await AsyncStorage.multiRemove(keys);
  return keys.length;
}
