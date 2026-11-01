import React, { useState, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { ErrorNote, Card, Eyebrow } from '../components/Screen';
import { Segmented, ResultLine } from '../components/Shared';
import { useAsync } from '../hooks/useAsync';
import { useSeason } from '../hooks/useSeason';
import { useTeamColor } from '../hooks/useTeams';
import { driverStandings, constructorStandings, lineups } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { projectDrivers, projectTeams, pointsAt } from '../lib/whatif';
import { shortName } from '../lib/time';
import { colors } from '../theme';

const arrow = (r) => (r.delta > 0 ? `▲${r.delta}` : r.delta < 0 ? `▼${-r.delta}` : '–');
// Tap drivers in finishing order, then see how the championship would look.
export default function WhatIfScreen() {
  const season = useSeason(); const tc = useTeamColor();
  const d = useAsync(() => driverStandings(YEAR), []); const t = useAsync(() => constructorStandings(YEAR), []);
  const lu = useAsync(() => lineups(YEAR), []); // only drivers on the current grid can be picked
  const active = useMemo(() => new Set(Object.values(lu.v || {}).flat().map((x) => x.driverId)), [lu.v]);
  const hasSprint = !!season.sessions?.some((s) => s.session_name === 'Sprint');
  const [seg, setSeg] = useState('order'); const [kind, setKind] = useState('race'); const [orders, setOrders] = useState({ race: [], sprint: [] });
  const order = orders[kind];
  const toggle = (id) => setOrders((o) => ({ ...o, [kind]: o[kind].includes(id) ? o[kind].filter((x) => x !== id) : [...o[kind], id] }));
  const drivers = (d.v || []).filter((x) => !lu.v || active.has(x.driverId));
  const proj = useMemo(() => (d.v ? projectDrivers(d.v, orders) : []), [d.v, orders]);
  const projT = useMemo(() => (d.v && t.v ? projectTeams(t.v, proj) : []), [d.v, t.v, proj]);
  const picker = [...order.map((id) => drivers.find((x) => x.driverId === id)).filter(Boolean), ...drivers.filter((x) => !order.includes(x.driverId))];
  const next = season.next ? shortName(season.next.meeting_name) : 'the next race';
  const placed = orders.race.length + orders.sprint.length;
  return (
    <Screen header={false} swipe={{ index: ['order', 'drivers', 'teams'].indexOf(seg), count: 3, onIndex: (i) => setSeg(['order', 'drivers', 'teams'][i]) }}>
      <Segmented value={seg} onChange={setSeg} items={[['order', 'Result'], ['drivers', 'Drivers'], ['teams', 'Teams']]} />
      {(d.loading || t.loading) && <Skeleton rows={4} />}
      {d.error && <ErrorNote error={d.error} onRetry={d.reload} />}
      {seg === 'order' && d.v && (
        <View>
          <Card>
            <Eyebrow>{`What if · ${next}`}</Eyebrow>
            {hasSprint ? <View style={{ marginTop: 12 }}><Segmented value={kind} onChange={setKind} items={[['race', 'Race'], ['sprint', 'Sprint']]} /></View> : null}
            {placed > 0 ? <Pressable onPress={() => setOrders({ race: [], sprint: [] })} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 12 }}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>Reset everything</Text></Pressable> : null}
          </Card>
          <View style={{ marginTop: 6 }}>
            {picker.map((r) => { const i = order.indexOf(r.driverId); return (
              <ResultLine key={r.driverId} pos={i >= 0 ? i + 1 : '+'} first={r.first} last={r.last} color={tc(r.teamId)} photoId={r.driverId} right={i >= 0 ? `+${pointsAt(kind, i)}` : `${r.points}`} sub={i >= 0 ? 'points' : `P${r.position} now`} onPress={() => toggle(r.driverId)} />); })}
          </View>
        </View>)}
      {seg === 'drivers' && d.v && (
        <View>
          {proj.map((r) => <ResultLine key={r.driverId} pos={r.newPos} first={r.first} last={r.last} color={tc(r.teamId)} photoId={r.driverId} logoId={r.teamId} right={`${r.total}`} sub={r.add ? `+${r.add} · ${arrow(r)}` : arrow(r)} />)}
        </View>)}
      {seg === 'teams' && d.v && t.v && (
        <View>
          {projT.map((r) => <ResultLine key={r.teamId} pos={r.newPos} first="" last={r.name} color={tc(r.teamId)} midLogoId={r.teamId} right={`${r.total}`} sub={r.add ? `+${r.add} · ${arrow(r)}` : arrow(r)} />)}
        </View>)}
    </Screen>
  );
}
