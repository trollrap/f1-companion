import { DICT, PATTERNS } from '../i18n/el';
import { ui } from './motion';
// Language switch. English is the source text; Greek (beta) is looked up by exact string, then by pattern, then part by part.
// Names (drivers, teams, principals) are not in the dictionary, so they always pass through unchanged.
const cache = new Map(); const misses = new Set();
export const lang = () => ui.lang || 'en';
export const setLang = (l) => { if ((ui.lang || 'en') !== l) { ui.lang = l; cache.clear(); } };
const lead = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}.)]*)$/su;
function one(s) {
  if (DICT[s] !== undefined) return DICT[s];
  for (const [re, to] of PATTERNS) { const m = re.exec(s); if (m) return typeof to === 'function' ? to(m) : s.replace(re, to); }
  return null;
}
function greek(s) {
  const whole = one(s); if (whole != null) return whole;
  // emoji or punctuation around a known word: "🇲🇽 Mexico"
  const m = lead.exec(s);
  if (m && (m[1] || m[3]) && m[2]) { const core = one(m[2]); if (core != null) return m[1] + core + m[3]; }
  // "a · b · c": translate each part
  if (s.includes(' · ')) { const parts = s.split(' · '); const out = parts.map((p) => { const g = one(p); return g != null ? g : p; }); return out.join(' · '); }
  // "Mexico, Mexico City" style place lines keep the place and translate a trailing country
  const comma = /^(.*), ([^,]+)$/.exec(s); if (comma) { const c = DICT[comma[2]]; if (c !== undefined) return `${comma[1]}, ${c}`; }
  if (/[A-Za-z]{4}/.test(s) && s.includes(' ') && s.length > 12) misses.add(s);
  return s;
}
export function tr(s) {
  if (typeof s !== 'string' || ui.lang !== 'el' || !s) return s;
  let v = cache.get(s); if (v === undefined) { if (cache.size > 4000) cache.clear(); v = greek(s); cache.set(s, v); } return v;
}
// JSX like {n} pts arrives as ["365", " pts"]: when every piece is text or a number, translate the joined sentence.
export const trKids = (c) => {
  if (typeof c === 'string') return tr(c);
  if (!Array.isArray(c)) return c;
  if (c.length > 1 && c.every((x) => typeof x === 'string' || typeof x === 'number')) { const j = c.join(''), g = tr(j); return g !== j ? g : c.map((x) => (typeof x === 'string' ? tr(x) : x)); }
  return c.map((x) => (typeof x === 'string' ? tr(x) : x));
};
export const missed = () => [...misses];
// Notification text is built outside React, so it asks for the language directly.
export const L = (en, el) => (ui.lang === 'el' ? el : en);
// Upper case that also works for Greek: capitals carry no accents, so "Αποτελέσματα" becomes "ΑΠΟΤΕΛΕΣΜΑΤΑ".
export const up = (s) => { const x = tr(s); return ui.lang === 'el' ? x.toUpperCase().normalize('NFD').replace(/[\u0301\u0308]/g, '').normalize('NFC') : x.toUpperCase(); };
