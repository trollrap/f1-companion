import React, { useState } from 'react';
import { View, Image } from 'react-native';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { ErrorNote, Card, Eyebrow, Note } from '../components/Screen';
import { StatGrid } from '../components/Shared';
import Dropdown from '../components/Dropdown';
import Grad, { Scrim } from '../components/Grad';
import { driverPhoto } from '../lib/media';
import { TeamBadge } from '../components/Shared';
import { SeasonRow } from '../components/RaceRows';
import { useAsync } from '../hooks/useAsync';
import { useTeamColor } from '../hooks/useTeams';
import { driverSeasons, driverSeasonResults } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { seasonStats } from '../lib/stats';
import { colors } from '../theme';

// Every earlier season a driver raced in, newest first. Results only for now (no full race pages yet).
export default function DriverSeasonsScreen({ route }) {
  const { driverId, name } = route.params; const tc = useTeamColor();
  const list = useAsync(async () => (await driverSeasons(driverId)).filter((y) => y < YEAR), [driverId]);
  const [sel, setSel] = useState(null);
  const cur = sel ?? list.v?.[0] ?? null;
  const res = useAsync(() => (cur ? driverSeasonResults(cur, driverId) : Promise.resolve(null)), [cur, driverId]);
  const rows = res.v || [];
  const yTeamId = rows.at(-1)?.teamId || null, yTeam = rows.at(-1)?.team || null; // the team of the viewed season, not the current one
  const color = yTeamId ? tc(yTeamId) : route.params.color || tc(route.params.teamId), photo = driverPhoto(driverId);
  const S = rows.length ? seasonStats(rows, null, null) : null;
  return (
    <Screen header={false}>
      <Grad color={color} from={0.62} to={0.05} border={0.5} style={{ height: 150 }}>
        {photo ? <Image source={photo} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: -14, bottom: -22, width: 176, height: 176 }} /> : null}
        {photo ? <Scrim dir="h" from={0.55} to={0} style={{ right: '35%' }} /> : null}
        <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>Previous seasons</Text>
          <View style={{ maxWidth: '64%' }}>
            <Text style={{ fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: 28, color: colors.fg }} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{name}</Text>
            {yTeam ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}><TeamBadge teamId={yTeamId} name={yTeam} size={24} /><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{`${yTeam} · ${cur}`}</Text></View> : null}
          </View>
        </View>
      </Grad>
      {list.loading && <Skeleton />}
      {list.error && <ErrorNote error={list.error} onRetry={list.reload} />}
      {list.v && !list.v.length && <Card><Note>No earlier seasons found for this driver.</Note></Card>}
      {list.v?.length > 0 && (
        <View>
          <Eyebrow>Season</Eyebrow>
          <View style={{ marginTop: 10 }}><Dropdown value={cur} options={list.v.map((y) => [y, String(y)])} onChange={setSel} /></View>
          {res.loading && <View style={{ marginTop: 12 }}><Skeleton /></View>}
          {res.error && <ErrorNote error={res.error} onRetry={res.reload} />}
          {S && <StatGrid cols={3} items={[['Races', String(S.races)], ['Wins', String(S.wins)], ['Podiums', String(S.podiums)], ['In points', String(S.pointsFinishes)], ['Fast laps', String(S.fastest)], ['DNF / NC', String(S.notClassified)]]} />}
          <View style={{ marginTop: 6 }}>{rows.map((r) => <SeasonRow key={r.round} r={r} color={color} />)}</View>
        </View>
      )}
    </Screen>
  );
}
