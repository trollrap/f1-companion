import { kvGet, kvSet } from './kv';
// Past races saved to watch later: [{ y, r, name, done }]. Stored as kv `watchlist`.
const KEY = 'watchlist';
export const readWatch = async () => { const l = await kvGet(KEY, []); return Array.isArray(l) ? l.filter((x) => x && x.y && x.r) : []; };
export const writeWatch = (l) => kvSet(KEY, l);
export const hasWatch = (l, y, r) => l.some((x) => x.y === y && x.r === r);
