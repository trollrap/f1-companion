import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import Reveal from '../components/Reveal';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
import { kvGet, kvSet, rngOf, seedOf } from '../lib/kv';
import { awardPack } from '../lib/cards';
import { useRun, useLeaveGuard, useTimers } from '../lib/gameSave';
import { makeOdd } from '../lib/oddOne';

const N = 10;
export default function OddOneOutScreen() {
  const run = useRun('odd'); const { seed, i, score } = run; const later = useTimers(); const [pick, setPick] = useState(null); const [best, setBest] = useState(0); const [got, setGot] = useState(false);
  React.useEffect(() => { kvGet('odd:best', 0).then(setBest); }, []);
  const rounds = useMemo(() => { if (!seed) return []; const r = rngOf(seedOf(`odd${seed}`)); const out = []; for (let k = 0; k < N; k++) { try { const q = makeOdd(r); if (q) out.push(q); } catch {} } return out; }, [seed]);
  const total = rounds.length; const done = total > 0 && i >= total; useLeaveGuard(run.ready && i > 0 && !done);
  if (!run.ready) return <Screen header={false}><Note>Loading…</Note></Screen>;
  if (total < 3) return <Screen header={false}><Note>Not enough history to make a round.</Note></Screen>;
  if (done) return (<Screen header={false}><Card><Eyebrow>Odd one out</Eyebrow><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800' }}>{`${score} / ${total}`}</Text><Note>{`Best ${Math.max(best, score)}.`}</Note>{got ? <Note>You earned a card pack.</Note> : null}</Card><Btn tone="solid" onPress={() => { setPick(null); setGot(false); run.again(); }}>Play again</Btn></Screen>);
  const cur = rounds[i];
  const choose = (k) => { if (pick !== null) return; setPick(k); const ok = k === cur.odd; ok ? hap.good() : hap.bad(); const sc = score + (ok ? 1 : 0); if (ok) run.setScore(sc);
    later(async () => { setPick(null); run.setI((x) => x + 1); if (i + 1 >= total) { run.finish(); if (sc > best) { setBest(sc); kvSet('odd:best', sc); } if (sc >= 9) setGot(await awardPack('odd:9')); } }, 1600); };
  return (
    <Screen header={false}>
      <Card hero><Eyebrow>{`Odd one out · ${i + 1} of ${total}`}</Eyebrow><Text style={{ color: colors.fg, fontSize: 19, fontWeight: '700', marginTop: 4 }}>{cur.q}</Text></Card>
      {cur.options.map((o, k) => { const right = pick !== null && k === cur.odd, wrong = pick === k && k !== cur.odd;
        return (<Reveal key={`${i}${k}`} index={k}><Pressable accessibilityRole="button" onPress={() => choose(k)} style={{ padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: right ? colors.good : wrong ? colors.accent : colors.line, backgroundColor: right ? alpha(colors.good, 0.2) : wrong ? alpha(colors.accent, 0.18) : colors.card }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '600' }}>{o}</Text></Pressable></Reveal>); })}
      {pick !== null ? <Note>{`${pick === cur.odd ? 'Correct. ' : 'Not quite. '}${cur.why}`}</Note> : null}
    </Screen>);
}
