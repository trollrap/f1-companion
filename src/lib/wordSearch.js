import { driversMeta } from '../api/history';
import { CIRCUITS } from '../data/circuits';

const plain = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
const shuffle = (r, a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const TEAMS = ['Ferrari', 'McLaren', 'Williams', 'Mercedes', 'Alpine', 'Haas', 'Sauber', 'Renault', 'Lotus', 'Brabham', 'Tyrrell', 'Benetton', 'Jordan', 'Minardi', 'Brawn', 'Jaguar', 'Arrows', 'Ligier', 'Cooper', 'Honda', 'Toyota'];
const DIRS = [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1]];
export const SIZE = 10;
// A SIZE x SIZE letter grid with six hidden words (surnames, teams, circuits). Same `r` gives the same grid. Words run in any of eight directions.
export function makeWordSearch(r, n = 6) {
  const pool = [...driversMeta().filter((d) => d.races >= 60 && d.lastYear >= 1985).map((d) => ({ cat: 'Driver', text: d.last })), ...TEAMS.map((t) => ({ cat: 'Team', text: t })), ...CIRCUITS.map((c) => ({ cat: 'Circuit', text: c.place.split(',')[0] }))]
    .map((w) => ({ ...w, w: plain(w.text) })).filter((w) => w.w.length >= 4 && w.w.length <= SIZE);
  for (let attempt = 0; attempt < 30; attempt++) {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill('')); const placed = []; const used = new Set();
    for (const w of shuffle(r, pool)) {
      if (placed.length === n) break; if (used.has(w.w) || placed.some((p) => p.w.includes(w.w) || w.w.includes(p.w))) continue;
      for (let t = 0; t < 60; t++) {
        const [dr, dc] = DIRS[Math.floor(r() * DIRS.length)]; const r0 = Math.floor(r() * SIZE), c0 = Math.floor(r() * SIZE);
        const r1 = r0 + dr * (w.w.length - 1), c1 = c0 + dc * (w.w.length - 1); if (r1 < 0 || r1 >= SIZE || c1 < 0 || c1 >= SIZE) continue;
        let ok = true; for (let k = 0; k < w.w.length; k++) { const c = g[r0 + dr * k][c0 + dc * k]; if (c && c !== w.w[k]) { ok = false; break; } } if (!ok) continue;
        for (let k = 0; k < w.w.length; k++) g[r0 + dr * k][c0 + dc * k] = w.w[k];
        placed.push({ ...w, a: [r0, c0], b: [r1, c1] }); used.add(w.w); break;
      }
    }
    if (placed.length < n) continue;
    const L = 'ABCDEFGHIJKLMNOPRSTUVWY'; for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE; j++) if (!g[i][j]) g[i][j] = L[Math.floor(r() * L.length)];
    return { grid: g, words: placed };
  }
  return null;
}
// Cells on the straight line from a to b, or null when it is not a row, column or diagonal.
export function lineCells(a, b) {
  const dr = b[0] - a[0], dc = b[1] - a[1]; const n = Math.max(Math.abs(dr), Math.abs(dc)); if (n === 0 || (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc))) return null;
  const sr = Math.sign(dr), sc = Math.sign(dc); return Array.from({ length: n + 1 }, (_, k) => [a[0] + sr * k, a[1] + sc * k]);
}
