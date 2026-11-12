import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { Btn } from '../components/FunBits';
import { colors, alpha } from '../theme';
import { kvGet, kvSet, seedOf, rngOf } from '../lib/kv';
import { awardPack } from '../lib/cards';
import * as hap from '../lib/haptics';

// Who said it? Famous team radio moments, retold in our own words (not the exact lines). Moments checked against Formula1.com's list of memorable radio messages.
const Q = [
  ['After winning, he sent a blunt message to his critics, opening with "to whom it may concern".', 'Valtteri Bottas', '2019 Australian GP'],
  ['After crashing in Q2 at Baku he told the team the mistake was entirely his own.', 'Charles Leclerc', '2019 Azerbaijan GP'],
  ['Clinching both titles, he lavished praise on his technical chief and the whole team.', 'Michael Schumacher', '2000 Japanese GP'],
  ['After a McLaren win he reminded doubters he had never really gone away, just stepped aside for a while.', 'Daniel Ricciardo', '2021 Italian GP'],
  ['Annoyed by his Honda engine at Suzuka, he compared it to a junior-category power unit.', 'Fernando Alonso', '2015 Japanese GP'],
  ['After winning, he joked about his status in the team, calling himself a number two.', 'Mark Webber', '2010 British GP'],
  ['When his engineer mentioned his mother had a birthday, he sang to her over the radio.', 'Lando Norris', '2022 Emilia-Romagna GP'],
  ['Fighting for victory, he told his engineer to stop the gap updates because he knew what to do.', 'Kimi Räikkönen', '2012 Abu Dhabi GP'],
  ['After a late collision, he snapped at his team boss to let him get on with driving.', 'George Russell', '2024 Austrian GP'],
  ['Engineer who relayed a team order, telling a driver that his team-mate was faster and asking him to confirm he understood.', 'Rob Smedley', '2010 German GP'],
];
const EXTRA = ['Lewis Hamilton', 'Max Verstappen', 'Sebastian Vettel', 'Carlos Sainz', 'Nico Rosberg', 'Jenson Button', 'Felipe Massa', 'Oscar Piastri', 'Pierre Gasly', 'Sergio Pérez'];
const N = 8;
export function RadioGameScreen() {
  const [seed, setSeed] = useState(1); const [i, setI] = useState(0); const [score, setScore] = useState(0); const [pick, setPick] = useState(null); const [best, setBest] = useState(0); const [got, setGot] = useState(false);
  useEffect(() => { kvGet('radio:best', 0).then(setBest); }, []);
  const rounds = useMemo(() => { const r = rngOf(seedOf(`radio${seed}${Date.now()}`)); const shuf = (a) => { const x = [...a]; for (let k = x.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [x[k], x[j]] = [x[j], x[k]]; } return x; };
    return shuf(Q).slice(0, N).map((q) => { const pool = [...Q.map((x) => x[1]), ...EXTRA].filter((n) => n !== q[1] && !(q[1] === 'Rob Smedley' ? false : n === 'Rob Smedley')); return { q, opts: shuf([q[1], ...shuf([...new Set(pool)]).slice(0, 3)]) }; }); }, [seed]);
  const done = i >= N; const cur = rounds[Math.min(i, N - 1)];
  const answer = (o) => { if (pick || done) return; setPick(o); const ok = o === cur.q[1]; ok ? hap.good() : hap.bad(); const sc = score + (ok ? 1 : 0); if (ok) setScore(sc);
    setTimeout(async () => { setPick(null); setI((x) => x + 1); if (i + 1 >= N) { if (sc > best) { setBest(sc); kvSet('radio:best', sc); } if (sc >= 7) setGot(await awardPack('radio:7')); } }, 1700); };
  const again = () => { setSeed((s) => s + 1); setI(0); setScore(0); setPick(null); setGot(false); };
  if (done) return (
    <Screen header={false}>
      <Card><Eyebrow>Team radio</Eyebrow><Text style={{ color: colors.fg, fontSize: 44, fontWeight: '900', marginTop: 6 }}>{score} / {N}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>Best: {Math.max(best, score)} / {N}</Text><View style={{ marginTop: 14 }}><Btn onPress={again}>Play again</Btn></View></Card>
      {got ? <Note>You earned a card pack. Open it in Cards.</Note> : null}
      <Note>Score 7 or more once to earn a card pack.</Note>
    </Screen>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Radio ${i + 1} of ${N}  ·  score ${score}`}</Eyebrow><Text style={{ color: colors.fg, fontSize: 19, lineHeight: 27, marginTop: 10, fontStyle: 'italic' }}>{cur.q[0]}</Text><Text style={{ color: colors.muted, marginTop: 8 }}>Who was on the radio?</Text></Card>
      {cur.opts.map((o) => { const right = pick && o === cur.q[1]; const wrong = pick === o && o !== cur.q[1];
        return (<Pressable key={o} accessibilityRole="button" onPress={() => answer(o)} style={({ pressed }) => [{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: right ? colors.good : wrong ? colors.red : colors.line, backgroundColor: right ? alpha(colors.good, 0.18) : wrong ? alpha(colors.red, 0.18) : colors.card }, pressed && { opacity: 0.8 }]}>
          <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{o}</Text></Pressable>); })}
      {pick ? <Note>{`${cur.q[1]}, ${cur.q[2]}.`}</Note> : null}
    </Screen>);
}
