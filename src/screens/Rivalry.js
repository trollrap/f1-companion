import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import { Btn } from '../components/FunBits';
import RivalryCard from '../components/RivalryCard';
import { useAsync } from '../hooks/useAsync';
import { usePrefs } from '../hooks/usePrefs';
import { driverStandings } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { colors, alpha } from '../theme';

export default function RivalryScreen({ navigation }) {
  const { prefs, setOpt } = usePrefs(); const st = useAsync(() => driverStandings(YEAR), []); const rows = st.v || [];
  const pair = prefs.opts?.rivalry; const [pick, setPick] = useState([]);
  const toggle = (id) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 2 ? [...p, id] : [p[1], id]));
  const save = () => { if (pick.length === 2) { setOpt('rivalry', pick); setPick([]); } };
  return (
    <Screen header={false}>
      <Card><Eyebrow>Rivalry</Eyebrow><Note>Pin two drivers and Home shows their season head-to-head, live. Turn the card on or off in Settings, Home layout.</Note></Card>
      {pair ? <RivalryCard pair={pair} rows={rows} onPress={() => {}} /> : null}
      {pair ? <Btn onPress={() => setOpt('rivalry', null)}>Remove the pinned rivalry</Btn> : null}
      <Eyebrow>{pick.length === 2 ? 'Ready to pin' : `Pick two drivers (${pick.length} of 2)`}</Eyebrow>
      {st.error && !rows.length ? <ErrorNote>Could not load the standings.</ErrorNote> : null}
      <View style={{ gap: 8 }}>
        {rows.map((r) => { const on = pick.includes(r.driverId); return (
          <Pressable key={r.driverId} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => toggle(r.driverId)} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: on ? colors.accent : colors.line, backgroundColor: on ? alpha(colors.accent, 0.14) : colors.card }}>
            <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }}>{`${r.position}. ${r.name}`}</Text><Text style={{ color: colors.muted }}>{`${r.points} pts`}</Text>
          </Pressable>); })}
      </View>
      <Btn tone="solid" onPress={save}>{pick.length === 2 ? 'Pin this rivalry' : 'Choose two drivers'}</Btn>
    </Screen>);
}
