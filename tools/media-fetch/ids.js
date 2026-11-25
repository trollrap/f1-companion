// The id the app uses for each driver (same rule as src/api/history.js): the surname when it is unique, otherwise first_last.
// Photos must be saved under this id (or the Jolpica id, which is usually the same) for the app to find them.
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const strip = (s) => s.replace(/ (jr|sr)$/, '');
const slug = (s) => norm(s).replace(/ /g, '_');
function appIds(H) {
  const fam = {}; H.d.forEach((d) => { const k = slug(strip(norm(d[2]))); fam[k] = (fam[k] || 0) + 1; });
  return H.d.map((d) => { const k = slug(strip(norm(d[2]))); return fam[k] === 1 ? k : `${slug(d[1])}_${slug(d[2])}`; });
}
module.exports = { appIds };
