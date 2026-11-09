// The Home screen is a list of cards. The user can reorder them and hide some (Settings > Home layout). Stored as [{k, on}].
export const HOME_CARDS = [['next', 'Next race'], ['explore', 'Explore strip'], ['mine', 'Your drivers and teams'], ['last', 'Last session'], ['standings', 'Driver standings']];
const KEYS = HOME_CARDS.map(([k]) => k);
export function homeLayout(raw) {
  const out = []; const seen = new Set();
  (Array.isArray(raw) ? raw : []).forEach((x) => { if (x && KEYS.includes(x.k) && !seen.has(x.k)) { seen.add(x.k); out.push({ k: x.k, on: x.on !== false }); } });
  KEYS.forEach((k) => { if (!seen.has(k)) out.push({ k, on: true }); });
  return out;
}
export const homeOrder = (raw) => homeLayout(raw).filter((x) => x.on).map((x) => x.k);
