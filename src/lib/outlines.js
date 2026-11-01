import { useEffect, useState } from 'react';
import { fetchOutline } from '../api/openf1';
// Track outlines come from OpenF1 location data (about three requests per circuit, kept for 30 days). OpenF1 allows 30 requests a minute,
// so they are fetched one circuit at a time with a pause after every real network fetch. Screens read what has arrived and redraw when more does.
const store = {}; const subs = new Set(); let queue = []; let busy = false;
const emit = () => subs.forEach((f) => f());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pump() {
  if (busy) return; busy = true;
  while (queue.length) {
    const key = queue.shift(); if (key in store) continue;
    const t0 = Date.now();
    try { const p = await fetchOutline(key); store[key] = p && p.length > 20 ? p : null; } catch { store[key] = null; }
    emit();
    if (Date.now() - t0 > 200) await sleep(6500); // a real fetch: leave room for OpenF1's per-minute limit
  }
  busy = false;
}
// First = most important (fetched earliest).
export function wantOutlines(keys) { keys.filter((k) => k && !(k in store) && !queue.includes(k)).forEach((k) => queue.push(k)); pump(); }
export function useOutline(key) {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); if (key && !(key in store)) { queue = [key, ...queue.filter((k) => k !== key)]; pump(); } return () => { subs.delete(f); }; }, [key]);
  return key ? store[key] || null : null;
}
export function useOutlinesVersion() {
  const [v, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return v;
}
export const outlineFor = (key) => (key ? store[key] || null : null);
