import React, { useState, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { ErrorNote, Card, Eyebrow, Note } from '../components/Screen';
import LineChart from '../components/LineChart';
import { useAsync } from '../hooks/useAsync';
import { useTeamColor } from '../hooks/useTeams';
import { seasonPoints } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { colors, alpha } from '../theme';

// Points after every round. Tap a name to show or hide its line.
export default function ChartScreen({ route }) {
  const tc = useTeamColor(); const seg = route?.params?.kind === 'teams' ? 'teams' : 'drivers', year = route?.params?.year || YEAR; const [pick, setPick] = useState({});
  const d = useAsync(() => seasonPoints(year), [year]);
  const list = d.v ? (seg === 'drivers' ? d.v.drivers : d.v.teams) : [];
  const key = (o) => o.driverId || o.teamId;
  const on = (o, i) => (pick[seg + key(o)] ?? i < 5);
  const series = useMemo(() => {
    const seen = {};
    return list.map((o, i) => { const c = tc(o.teamId); const dash = !!seen[c]; seen[c] = true; return { o, i, id: key(o), color: c, dash, values: o.pts, label: seg === 'drivers' ? o.last : o.name }; });
  }, [list, tc]);
  const shown = series.filter((s) => on(s.o, s.i));
  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>{`${seg === 'drivers' ? 'Drivers' : 'Teams'} · points after each round · ${year}`}</Eyebrow>
        {d.loading && <Skeleton />}
        {d.error && <ErrorNote error={d.error} onRetry={d.reload} />}
        {d.v && !d.v.rounds.length && <Note>No results yet this season.</Note>}
        {d.v && d.v.rounds.length > 0 && <View style={{ marginTop: 12 }}><LineChart series={shown} rounds={d.v.rounds} /></View>}
      </Card>
      {d.v && (
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {series.map((s) => {
              const active = on(s.o, s.i);
              return (
                <Pressable key={s.id} onPress={() => setPick((p) => ({ ...p, [seg + s.id]: !active }))} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: active ? alpha(s.color, 0.8) : colors.line, backgroundColor: active ? alpha(s.color, 0.16) : colors.surface2 }, pressed && { opacity: 0.8 }]}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: active ? s.color : colors.muted }} />
                  <Text style={{ color: active ? colors.fg : colors.muted, fontWeight: '600', fontSize: 15 }}>{seg === 'drivers' ? s.o.last : s.o.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 14 }}>{s.values[s.values.length - 1]}</Text>
                </Pressable>);
            })}
          </View>
        </View>)}
    </Screen>
  );
}
