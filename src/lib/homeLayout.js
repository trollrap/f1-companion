// The Home screen is a list of cards. The user can reorder them and hide some (Settings > Home layout). Stored as [{k, on}].
export const HOME_CARDS = [['pins', 'Pinned pages'], ['next', 'Next race'], ['last', 'Last session'], ['mine', 'Your drivers and teams'], ['stats', 'Statistics'], ['rivalry', 'Rivalry'], ['standings', 'Driver standings'], ['explore', 'Explore strip'], ['stat', 'Stat of the day'], ['recap', 'Race recap']];
const KEYS = HOME_CARDS.map(([k]) => k);
// Cards that start switched off for someone who has never opened the layout editor (a saved layout always wins). Turn them on in Settings > Home layout.
const OFF_BY_DEFAULT = ['stat', 'recap'];
export function homeLayout(raw) {
  if (Array.isArray(raw) && raw.length && !raw.some((x) => x && x.k === 'stats')) raw = null; // a layout saved before the Statistics card existed gives way to the new default order
  const out = []; const seen = new Set(); const fresh = !Array.isArray(raw) || raw.length === 0;
  (Array.isArray(raw) ? raw : []).forEach((x) => { if (x && KEYS.includes(x.k) && !seen.has(x.k)) { seen.add(x.k); out.push({ k: x.k, on: x.on !== false }); } });
  KEYS.forEach((k) => { if (!seen.has(k)) (k === 'pins' ? out.unshift({ k, on: true }) : out.push({ k, on: !(fresh && OFF_BY_DEFAULT.includes(k)) })); });
  return out;
}
export const homeOrder = (raw) => homeLayout(raw).filter((x) => x.on).map((x) => x.k);
