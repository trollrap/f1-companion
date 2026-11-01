import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Your own predictions, kept on this phone. One entry per round: { pole, podium: [P1, P2, P3] } as Jolpica driver ids.
// Scoring: pole +2; each podium pick +3 when exactly right, +1 when the driver is on the podium in another place. Best round: 11.
const KEY = 'predictions';
export function score(pred, quali, race) {
  const out = { pole: null, podium: [null, null, null], total: 0, done: false };
  if (quali?.length && pred.pole) { out.pole = quali[0].driverId === pred.pole ? 2 : 0; out.total += out.pole; }
  if (race?.length) {
    const top = race.slice(0, 3).map((r) => r.driverId);
    (pred.podium || []).forEach((id, i) => { if (!id) return; const p = id === top[i] ? 3 : top.includes(id) ? 1 : 0; out.podium[i] = p; out.total += p; });
    out.done = true;
  }
  return out;
}
export function usePredictions() {
  const [all, setAll] = useState({}); const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then((r) => { if (r) setAll(JSON.parse(r)); }).catch(() => {}).finally(() => setReady(true)); }, []);
  const set = useCallback((round, pred) => setAll((p) => { const n = { ...p, [round]: pred }; AsyncStorage.setItem(KEY, JSON.stringify(n)).catch(() => {}); return n; }), []);
  return { all, ready, set };
}
