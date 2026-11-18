import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { StatHeader } from '../components/StatRows';
import Reveal from '../components/Reveal';
import { colors, alpha } from '../theme';
import { engineBoard, teamNameOf } from '../api/history';
import { ENGINES } from '../data/engines';

const TINT = { Mercedes: '#27F4D2', Ferrari: '#F0141E', Renault: '#FFD800', Honda: '#CC0000' };
const stat = (v, l) => (<View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{l}</Text></View>);

export default function EngineHistoryScreen() {
  const B = useMemo(() => { try { return engineBoard(ENGINES, 2014, 2025); } catch { return null; } }, []);
  const [open, setOpen] = useState(null);
  if (!B) return <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;
  const races = Math.max(1, ...B.map((o) => o.wins)); const total = B.reduce((n, o) => n + o.wins, 0);
  return (
    <Screen header={false}>
      <StatHeader title="Power unit suppliers" icon="cog" note="The hybrid V6 turbo era, 2014 to 2025: results of every car by the engine behind it, works and customer teams together. Poles count a car starting from P1 on the grid. Titles go to the supplier of the winning car. The engine list is written by hand, see the note under it." />
      {B.map((o, i) => (
        <Reveal key={o.name} index={i}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === o.name }} onPress={() => setOpen(open === o.name ? null : o.name)}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 6, height: 28, borderRadius: 3, backgroundColor: TINT[o.name] || colors.accent }} /><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800', flex: 1 }}>{o.name}</Text><Text style={{ color: colors.muted }}>{`${Math.round((o.wins / Math.max(1, total)) * 100)}% of wins`}</Text></View>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.line, marginVertical: 10, overflow: 'hidden' }}><View style={{ width: `${(o.wins / races) * 100}%`, height: 5, backgroundColor: TINT[o.name] || colors.accent }} /></View>
              <View style={{ flexDirection: 'row' }}>{stat(o.wins, 'Wins')}{stat(o.podiums, 'Podiums')}{stat(o.poles, 'From P1')}{stat(o.driverTitles, 'Driver titles')}{stat(o.constructorTitles, 'Team titles')}</View>
              {open === o.name ? (<View style={{ marginTop: 10, gap: 3 }}><Text style={{ color: colors.muted, fontSize: 12 }}>Teams using this engine, by season</Text>{o.seasons.map((y) => (<Text key={y} style={{ color: colors.fg, fontSize: 14 }}><Text style={{ color: colors.accent, fontWeight: '700' }}>{`${y}  `}</Text>{o.teams[y].map(teamNameOf).join(', ')}</Text>))}</View>) : <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>Tap for the teams by season</Text>}
            </Card>
          </Pressable>
        </Reveal>))}
      <Note>Engine list: Marussia/Manor ran Ferrari in 2014 and 2015 and Mercedes in 2016; Toro Rosso ran Renault in 2014, 2015 and 2017, Ferrari in 2016 and Honda from 2018. Red Bull and its sister team ran Honda-built units under the Red Bull Powertrains name from 2022, so they stay under Honda. Edit data/engines.js if you spot a mistake.</Note>
    </Screen>);
}
