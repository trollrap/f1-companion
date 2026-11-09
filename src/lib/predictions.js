import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Your own predictions, kept on this phone. One entry per round: { pole, podium: [P1, P2, P3] } as Jolpica driver ids.
// Scoring: pole +2; each podium pick +3 when exactly right, +1 when the driver is on the podium in another place. Best round: 11.
const KEY = 'predictions';
// Power-ups: "double down" doubles one round's points (3 per season); each round also has a bonus yes/no question worth 2 points.
export const DOUBLES = 3;
const finished = (r) => r.status === 'Finished' || /^\+\d+ Laps?$/.test(r.status || '');
export const BONUS = [
  { q: 'Will the pole sitter win the race?', check: (race) => race[0]?.grid === 1 },
  { q: 'Will at least 3 cars not finish?', check: (race) => race.filter((r) => !finished(r)).length >= 3 },
  { q: 'Will the winner start outside the top 3?', check: (race) => race[0]?.grid > 3 },
  { q: 'Will a podium finisher set the fastest lap?', check: (race) => race.slice(0, 3).some((r) => r.fastest) },
];
export const bonusFor = (round) => BONUS[Math.abs(Number(round) || 0) % BONUS.length];
export function score(pred, quali, race, round) {
  const out = { pole: null, podium: [null, null, null], bonus: null, double: !!pred.x2, total: 0, done: false };
  if (quali?.length && pred.pole) { out.pole = quali[0].driverId === pred.pole ? 2 : 0; out.total += out.pole; }
  if (race?.length) {
    const top = race.slice(0, 3).map((r) => r.driverId);
    (pred.podium || []).forEach((id, i) => { if (!id) return; const p = id === top[i] ? 3 : top.includes(id) ? 1 : 0; out.podium[i] = p; out.total += p; });
    if (pred.bonus && round != null) { const ok = bonusFor(round).check(race); out.bonus = (pred.bonus === 'y') === ok ? 2 : 0; out.total += out.bonus; }
    out.done = true;
    if (pred.x2) out.total *= 2;
  }
  return out;
}
export function usePredictions() {
  const [all, setAll] = useState({}); const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then((r) => { if (r) setAll(JSON.parse(r)); }).catch(() => {}).finally(() => setReady(true)); }, []);
  const set = useCallback((round, pred) => setAll((p) => { const n = { ...p, [round]: pred }; AsyncStorage.setItem(KEY, JSON.stringify(n)).catch(() => {}); return n; }), []);
  return { all, ready, set };
}
