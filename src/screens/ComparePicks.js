import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import Reveal from '../components/Reveal';
import Skeleton from '../components/Skeleton';
import { useAsync } from '../hooks/useAsync';
import { useSeason } from '../hooks/useSeason';
import { sessionResults } from '../api/jolpica';
import { usePredictions, score } from '../lib/predictions';
import { YEAR } from '../api/openf1';
import { colors, alpha } from '../theme';

// Your saved predictions against the real results: points per round, how often each pick was right, and a running accuracy.
export default function ComparePicksScreen() {
  const P = usePredictions(); const season = useSeason();
  const rounds = useMemo(() => Object.keys(P.all).map(Number).filter((r) => { const x = P.all[r]; return x && (x.pole || (x.podium || []).some(Boolean)); }).sort((a, b) => a - b), [P.all]);
  const res = useAsync(async () => { const out = {}; for (const r of rounds) { const [q, rc] = await Promise.all([sessionResults(YEAR, r, 'qualifying').catch(() => null), sessionResults(YEAR, r, 'results').catch(() => null)]); out[r] = { q, rc }; } return out; }, [rounds.join(',')]);
  if (!P.ready) return <Screen header={false}><Skeleton /></Screen>;
  if (!rounds.length) return <Screen header={false}><Note>Make a prediction first. Your picks and how they did show up here once the race has run.</Note></Screen>;
  if (res.error) return <Screen header={false}><ErrorNote>Could not load the results.</ErrorNote></Screen>;
  if (!res.v) return <Screen header={false}><Skeleton /></Screen>;
  const nameOf = (rc, q) => { const m = {}; [...(rc || []), ...(q || [])].forEach((x) => { m[x.driverId] = x.last || x.driver; }); return (id) => m[id] || id || '—'; };
  const rows = rounds.map((r) => { const { q, rc } = res.v[r] || {}; const sc = score(P.all[r], q, rc, r); if (!sc.done) return null; const nm = nameOf(rc, q);
    const raw = (sc.pole || 0) + sc.podium.reduce((a, x) => a + (x || 0), 0); const gp = season.races?.find((x) => Number(x.round) === r);
    return { r, sc, raw, name: (gp?.raceName || `Round ${r}`).replace(/ Grand Prix$/, ''), pred: P.all[r], poleReal: q?.[0] ? nm(q[0].driverId) : null, top: (rc || []).slice(0, 3).map((x) => nm(x.driverId)), nm }; }).filter(Boolean);
  if (!rows.length) return <Screen header={false}><Note>Your predictions are saved. Once a race you predicted has finished, the comparison shows up here.</Note></Screen>;
  const n = rows.length; const total = rows.reduce((a, x) => a + x.sc.total, 0); const poleHit = rows.filter((x) => x.pred.pole && x.sc.pole === 2).length; const poleTried = rows.filter((x) => x.pred.pole && x.sc.pole !== null).length;
  const slots = rows.flatMap((x) => x.sc.podium.filter((v) => v !== null)); const exact = slots.filter((v) => v === 3).length; const onPod = slots.filter((v) => v >= 1).length;
  let cum = 0, mx = 0; const acc = rows.map((x) => { cum += x.raw; mx += 11; return cum / mx; });
  const top = Math.max(1, ...rows.map((x) => x.raw));
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');
  const Stat = ({ k, v }) => (<View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>{k}</Text></View>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Your picks, ${YEAR}`}</Eyebrow>
        <View style={{ flexDirection: 'row', marginTop: 8 }}><Stat k="rounds" v={n} /><Stat k="points" v={total} /><Stat k="per round" v={(total / n).toFixed(1)} /></View>
        <View style={{ flexDirection: 'row', marginTop: 12 }}><Stat k="pole right" v={pct(poleHit, poleTried)} /><Stat k="exact podium slots" v={pct(exact, slots.length)} /><Stat k="picks on podium" v={pct(onPod, slots.length)} /></View>
        <Note>Accuracy counts pole and podium points out of 11 a round. Bonus questions and double-down are in the total but not in the accuracy.</Note></Card>
      <Card><Eyebrow>Points per round</Eyebrow>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 4, marginTop: 8 }}>{rows.map((x) => (<View key={x.r} style={{ flex: 1, height: `${Math.max(6, (x.raw / top) * 100)}%`, backgroundColor: colors.accent, borderRadius: 4 }} />))}</View>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>{`Running accuracy: ${Math.round(acc[0] * 100)}% after the first round, ${Math.round(acc[acc.length - 1] * 100)}% now.`}</Text></Card>
      {[...rows].reverse().map((x, i) => (
        <Reveal key={x.r} index={Math.min(i, 6)}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }}>{`R${x.r} ${x.name}`}</Text><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }}>{`${x.sc.total} pts${x.sc.double ? ' (x2)' : ''}`}</Text></View>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{`Pole: you ${x.pred.pole ? x.nm(x.pred.pole) : '—'}, real ${x.poleReal || '—'}`}</Text>
            {[0, 1, 2].map((k) => (<Text key={k} style={{ color: x.sc.podium[k] === 3 ? colors.good : x.sc.podium[k] === 1 ? colors.gold : colors.muted, fontSize: 13 }}>{`P${k + 1}: you ${x.pred.podium?.[k] ? x.nm(x.pred.podium[k]) : '—'}, real ${x.top[k] || '—'}`}</Text>))}
          </Card>
        </Reveal>))}
    </Screen>);
}
