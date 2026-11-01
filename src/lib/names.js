// One consistent way to show driver names everywhere ("Oscar Piastri"), whatever the source spells ("Oscar PIASTRI").
const PARTICLES = new Set(['de', 'van', 'von', 'der', 'den', 'da', 'di', 'del', 'la', 'le']);
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const cap = (w) => w.split('-').map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p)).join('-');
export function nicePart(s, isLast = false) {
  if (!s) return '';
  if (s !== s.toUpperCase() || s.length < 2) return s; // already mixed case: keep it
  const words = s.split(' ');
  return words.map((w) => (isLast && words.length > 1 && PARTICLES.has(w.toLowerCase()) ? w.toLowerCase() : cap(w))).join(' ');
}
export const fullName = (first, last) => `${first} ${last}`.trim();
// Splits "Oscar PIASTRI" style strings when separate fields are not available.
export function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/); if (parts.length < 2) return { first: '', last: nicePart(parts[0] || '') };
  let i = parts.length - 1; while (i > 1 && (PARTICLES.has(parts[i - 1].toLowerCase()) || parts[i - 1] === parts[i - 1].toUpperCase())) i--;
  return { first: nicePart(parts.slice(0, i).join(' ')), last: nicePart(parts.slice(i).join(' '), true) };
}
