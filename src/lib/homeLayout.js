// The Home screen is a list of cards. The user can reorder them and hide some (Settings > Home layout). Stored as [{k, on}].
export const HOME_CARDS = [['pins', 'Pinned pages'], ['next', 'Next race'], ['explore', 'Explore strip'], ['stat', 'Stat of the day'], ['mine', 'Your drivers and teams'], ['last', 'Last session'], ['recap', 'Race recap'], ['standings', 'Driver standings']];
const KEYS = HOME_CARDS.map(([k]) => k);
export function homeLayout(raw) {
  const out = []; const seen = new Set();
  (Array.isArray(raw) ? raw : []).forEach((x) => { if (x && KEYS.includes(x.k) && !seen.has(x.k)) { seen.add(x.k); out.push({ k: x.k, on: x.on !== false }); } });
  KEYS.forEach((k) => { if (!seen.has(k)) (k === 'pins' ? out.unshift({ k, on: true }) : out.push({ k, on: true })); });
  return out;
}
export const homeOrder = (raw) => homeLayout(raw).filter((x) => x.on).map((x) => x.k);
