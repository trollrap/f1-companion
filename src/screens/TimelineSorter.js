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
import { useRun, useLeaveGuard } from '../lib/gameSave';
import { makeTimeline } from '../lib/timeline';

const N = 4;
export default function TimelineSorterScreen() {
  const run = useRun('tl'); const { seed, i, score } = run; const [order, setOrder] = useState([]); const [shown, setShown] = useState(false); const [best, setBest] = useState(0); const [got, setGot] = useState(false);
  React.useEffect(() => { kvGet('tl:best', 0).then(setBest); }, []);
  const rounds = useMemo(() => { if (!seed) return []; const out = []; for (let k = 0; k < N; k++) { try { const ev = makeTimeline(rngOf(seedOf(`tl${seed}${k}`))); if (ev) out.push(ev); } catch {} } return out; }, [seed]);
  const total = rounds.length; const done = total > 0 && i >= total; useLeaveGuard(run.ready && i > 0 && !done);
  if (!run.ready) return <Screen header={false}><Note>Loading…</Note></Screen>;
  if (total < 2) return <Screen header={false}><Note>Not enough history to make a round.</Note></Screen>;
  if (done) return (<Screen header={false}><Card><Eyebrow>Timeline sorter</Eyebrow><Text style={{ color: colors.fg, fontSize: 32, fontWeight: '800' }}>{`${score} / ${total * 5}`}</Text><Note>{`Events in the right place. Best ${Math.max(best, score)}.`}</Note>{got ? <Note>You earned a card pack.</Note> : null}</Card><Btn tone="solid" onPress={() => { setOrder([]); setShown(false); setGot(false); run.again(); }}>Play again</Btn></Screen>);
  const ev = rounds[i]; const want = [...ev.keys()].sort((a, b) => ev[a].year - ev[b].year); const right = order.filter((k, p) => want[p] === k).length;
  const tap = (k) => { if (shown) return; hap.tap(); setOrder((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k])); };
  const check = () => { hap.good(); setShown(true); run.setScore((s) => s + right); };
  const next = async () => { const last = i + 1 >= total; const sc = score; setOrder([]); setShown(false); if (last) { run.finish(); if (sc > best) { setBest(sc); kvSet('tl:best', sc); } if (sc >= total * 4) setGot(await awardPack('tl:great')); } run.setI(i + 1); };
  return (
    <Screen header={false}>
      <Card hero><Eyebrow>{`Timeline sorter · board ${i + 1} of ${total}`}</Eyebrow><Note>Tap the events from earliest to latest. Tap a placed one to take it back.</Note></Card>
      {ev.map((e, k) => { const p = order.indexOf(k); const ok = shown && want[p] === k; const bg = shown ? (ok ? alpha(colors.good, 0.25) : alpha(colors.accent, 0.2)) : p >= 0 ? alpha(colors.accent, 0.18) : colors.card;
        return (<Reveal key={`${i}${k}`} index={k}><Pressable accessibilityRole="button" accessibilityLabel={`${e.text}${p >= 0 ? `, position ${p + 1}` : ''}`} onPress={() => tap(k)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: p >= 0 ? colors.accent : colors.line, backgroundColor: bg }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: p >= 0 ? colors.accent : colors.line }}><Text style={{ color: '#fff', fontWeight: '800' }}>{p >= 0 ? p + 1 : ''}</Text></View>
          <Text style={{ color: colors.fg, fontSize: 16, flex: 1 }}>{e.text}</Text>
          {shown ? <Text style={{ color: colors.fg, fontWeight: '800' }}>{e.year}</Text> : null}
        </Pressable></Reveal>); })}
      {!shown ? <Btn tone="solid" onPress={order.length === 5 ? check : undefined}>{order.length === 5 ? 'Check order' : `Place ${5 - order.length} more`}</Btn> : <View style={{ gap: 8 }}><Note>{`${right} of 5 in the right place.`}</Note><Btn tone="solid" onPress={next}>{i + 1 >= total ? 'Finish' : 'Next board'}</Btn></View>}
    </Screen>);
}
