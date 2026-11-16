import { makeSeasonQ, makeCareerQ, makeShowdown } from './quizPack';
import { makeOdd } from './oddOne';

// One mixed question in a common shape: { kind, q, options: [text], answer: index, why }. `level` (0 and up) decides which kinds can appear:
// easy levels use head-to-heads and odd-one-out, later levels add season tables and career paths, which are the hardest.
const adapt = {
  showdown: (r) => { const s = makeShowdown(r); return s && { kind: 'Showdown', q: `Who has more ${s.label.replace('poles from P1', 'pole positions')}?`, options: [s.a, s.b], answer: s.win, why: `${s.a} ${s.av}, ${s.b} ${s.bv}.` }; },
  odd: (r) => { const o = makeOdd(r); return o && { kind: 'Odd one out', q: o.q, options: o.options, answer: o.odd, why: o.why }; },
  season: (r) => { const s = makeSeasonQ(r); return s && { kind: 'Name that season', q: `Final top five${s.races ? ` (${s.races} races)` : ''}. Which year?\n${s.rows.map((x, i) => `${i + 1}. ${x.name} ${x.pts}`).join('\n')}`, options: s.options, answer: s.answer, why: `It was ${s.year}.` }; },
  career: (r) => { const c = makeCareerQ(r); return c && { kind: 'Career path', q: `Which driver raced for these teams, in this order?\n${c.path.join(' > ')}`, options: c.options, answer: c.answer, why: `${c.name} (${c.years}).` }; },
};
export const LADDER_KINDS = (level) => (level < 3 ? ['showdown', 'odd'] : level < 7 ? ['odd', 'showdown', 'season'] : level < 11 ? ['season', 'career', 'odd'] : ['career', 'season']);
export function ladderQ(r, level) {
  const kinds = LADDER_KINDS(level);
  for (let n = 0; n < 12; n++) { try { const q = adapt[kinds[Math.floor(r() * kinds.length)]](r); if (q && q.options.length >= 2) return q; } catch {} }
  return null;
}
