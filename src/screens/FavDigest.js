import React from 'react';
import { View } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import { StatHeader } from '../components/StatRows';
import Reveal from '../components/Reveal';
import Skeleton from '../components/Skeleton';
import { useAsync } from '../hooks/useAsync';
import { buildDigest } from '../lib/digest';
import { colors } from '../theme';

const Big = ({ v, l }) => (<View style={{ alignItems: 'center', flex: 1 }}><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{l}</Text></View>);
export default function FavDigestScreen() {
  const q = useAsync(buildDigest, []); const d = q.v;
  return (
    <Screen header={false}>
      <StatHeader title="Favourites digest" icon="star" note="How your favourite drivers and teams did in the latest race, and where they stand in the championships. Result alerts for races now list your drivers too." />
      {q.loading ? <Skeleton rows={4} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {d && d.empty ? <Note>Favourite some drivers or teams in the Paddock and they will show up here.</Note> : null}
      {d && !d.empty && !d.race ? <Note>No race has been run yet this season.</Note> : null}
      {d && d.race ? <Text style={{ color: colors.accentText, fontWeight: '700' }}>{`${d.race.name} · round ${d.race.round}`}</Text> : null}
      {d && d.race ? d.drivers.map((x, i) => (
        <Reveal key={x.id} index={i}><Card>
          <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{x.name}</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Big v={x.pos ? (/^\d+$/.test(String(x.posText)) ? `P${x.pos}` : x.status || 'DNF') : '-'} l="Finish" /><Big v={x.grid > 0 ? `P${x.grid}` : x.grid === 0 ? 'Pit' : '-'} l="Grid" /><Big v={`+${x.pts}`} l="Points" /><Big v={x.seasonPos ? `P${x.seasonPos}` : '-'} l="Season" />{x.gap != null ? <Big v={x.gap ? `-${x.gap}` : 'Lead'} l="To leader" /> : null}
          </View>
        </Card></Reveal>)) : null}
      {d && d.race ? d.teams.map((x, i) => (
        <Reveal key={x.id} index={i + 3}><Card>
          <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{x.name}</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}><Big v={`+${x.pts}`} l="Race points" /><Big v={x.best ? `P${x.best}` : '-'} l="Best car" /><Big v={x.seasonPos ? `P${x.seasonPos}` : '-'} l="Season" /><Big v={x.seasonPts != null ? String(x.seasonPts) : '-'} l="Total" /></View>
        </Card></Reveal>)) : null}
    </Screen>);
}
