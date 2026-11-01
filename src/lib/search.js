// Accent- and case-insensitive match of a query against names: every word of the query has to start a word of the name or be inside it.
export const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function matches(query, ...fields) {
  const q = fold(query).trim(); if (!q) return true;
  const hay = fold(fields.join(' '));
  return q.split(/\s+/).every((w) => hay.includes(w));
}
