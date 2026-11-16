import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Reveal from '../components/Reveal';
import { Segmented } from '../components/Shared';
import { colors } from '../theme';
import { poleConversion } from '../api/history';

const TABS = [['drivers', 'Drivers'], ['teams', 'Teams'], ['circuits', 'Circuits'], ['years', 'Years']];
const NOTE = { drivers: 'Drivers with 10 or more poles.', teams: 'Teams with 20 or more poles.', circuits: 'Grands Prix with 15 or more races.', years: 'Every season, newest first.' };
export default function PoleConversionScreen() {
  const [t, setT] = useState('drivers'); const D = useMemo(() => { try { return poleConversion(); } catch { return null; } }, []);
  const [asc, setAsc] = useState(false);
  if (!D) return <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;
  let rows = D[t]; if (asc && t !== 'years') rows = [...rows].reverse(); rows = rows.slice(0, 25);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Pole to win</Eyebrow><Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800' }}>{`${Math.round((D.conv / D.poles) * 100)}%`}</Text><Note>{`${D.conv} of ${D.poles} races since 1950 were won from P1 on the grid. A grid penalty can make P1 differ from the official pole, so a few numbers can sit one off the record books.`}</Note></Card>
      <Segmented value={t} items={TABS} onChange={(v) => { setT(v); setAsc(false); }} />
      <Text style={{ color: colors.muted, fontSize: 13 }}>{NOTE[t]}</Text>
      {t !== 'years' ? <Text accessibilityRole="button" onPress={() => setAsc(!asc)} style={{ color: colors.accent, fontWeight: '700' }}>{asc ? 'Showing worst first. Tap for best first' : 'Showing best first. Tap for worst first'}</Text> : null}
      {rows.map((o, i) => (
        <Reveal key={`${t}${o.name}${asc}`} index={Math.min(i, 8)}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700', flex: 1 }} numberOfLines={1}>{o.name}</Text>
              <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{`${Math.round(o.rate * 100)}%`}</Text>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.line, marginTop: 6, overflow: 'hidden' }}><View style={{ width: `${o.rate * 100}%`, height: 5, backgroundColor: o.rate >= 0.5 ? colors.good : colors.accent }} /></View>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{`${o.wins} wins from ${o.poles} poles`}</Text>
          </Card>
        </Reveal>))}
    </Screen>);
}
