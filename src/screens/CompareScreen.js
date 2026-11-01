import React, { useState } from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import { DriverBox, Segmented } from '../components/Shared';
import Grad, { Scrim } from '../components/Grad';
import { driverPhoto } from '../lib/media';
import { useAsync } from '../hooks/useAsync';
import { useTeamColor, usePaddockMeta } from '../hooks/useTeams';
import { driverStandings, driverSeasonResults, driverSeasonQuali, driverCareer, driverTitles } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { seasonStats, headToHead, fix } from '../lib/stats';
import { colors, alpha } from '../theme';

// A row with the two values and a tug-of-war bar. lower: true means the smaller number wins.
function Row({ label, a, b, lower, ca, cb }) {
  const na = Number(a), nb = Number(b), numeric = !Number.isNaN(na) && !Number.isNaN(nb) && a !== '—' && b !== '—';
  const tie = !numeric || na === nb, aw = !tie && (lower ? na < nb : na > nb), bw = !tie && !aw;
  let share = 0.5;
  if (numeric && na + nb > 0) share = lower ? ((na ? 1 / na : 0) / ((na ? 1 / na : 0) + (nb ? 1 / nb : 0)) || 0.5) : na / (na + nb);
  return (
    <View style={s.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[s.v, aw && s.win]}>{a}</Text><Text style={s.k}>{label}</Text><Text style={[s.v, { textAlign: 'right' }, bw && s.win]}>{b}</Text>
      </View>
      {numeric && <View style={s.bar}><View style={{ flex: share, backgroundColor: alpha(ca, aw ? 1 : 0.45) }} /><View style={{ width: 2 }} /><View style={{ flex: 1 - share, backgroundColor: alpha(cb, bw ? 1 : 0.45) }} /></View>}
    </View>
  );
}
const dash = (v) => (v == null ? '—' : v);
export default function CompareScreen({ route }) {
  const { a } = route.params; const [b, setB] = useState(null); const [tab, setTab] = useState('season');
  const tc = useTeamColor(); const meta = usePaddockMeta();
  const grid = useAsync(() => driverStandings(YEAR), []);
  const loadSeason = async (id) => { const rows = await driverSeasonResults(YEAR, id); const q = await driverSeasonQuali(YEAR, id).catch(() => ({ poles: null, q3: null })); return { rows, stats: seasonStats(rows, q.poles, q.q3) }; };
  const sA = useAsync(() => loadSeason(a.driverId), [a.driverId]);
  const sB = useAsync(() => (b ? loadSeason(b.driverId) : Promise.resolve(null)), [b?.driverId]);
  const cA = useAsync(() => driverCareer(a.driverId, YEAR), [a.driverId]);
  const cB = useAsync(() => (b ? driverCareer(b.driverId, YEAR) : Promise.resolve(null)), [b?.driverId]);
  const tA = useAsync(() => driverTitles(a.driverId, YEAR), [a.driverId]);
  const tB = useAsync(() => (b ? driverTitles(b.driverId, YEAR) : Promise.resolve(null)), [b?.driverId]);
  const num = (id) => meta?.drivers?.[id]?.number;
  const standA = grid.v?.find((x) => x.driverId === a.driverId), standB = b && grid.v?.find((x) => x.driverId === b.driverId);
  const colA = tc(a.teamId), colB = b ? tc(b.teamId) : colors.muted;
  const hero = (d, col, side) => { const photo = driverPhoto(d.driverId), left = side === 'left'; return (
    <Grad color={col} from={0.62} to={0.08} style={{ flex: 1, height: 132 }}>
      {photo ? <Image source={photo} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', bottom: -14, [left ? 'right' : 'left']: -22, width: 128, height: 128 }} /> : null}
      {photo ? <Scrim dir="v" from={0} to={0.8} style={{ top: '40%' }} /> : null}
      <View style={{ flex: 1, padding: 12 }}>
        <Text style={{ fontFamily: 'display', fontWeight: '800', fontSize: 28, color: colors.fg, textAlign: side }}>{num(d.driverId) ?? ''}</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: side }} numberOfLines={1}>{d.first}</Text>
        <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700', textAlign: side }} numberOfLines={1}>{d.last}</Text>
      </View>
    </Grad>); };
  if (!b) return (
    <Screen header={false}>
      <Grad color={colA} from={0.55} to={0.05} style={{ padding: 14 }}>
        <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>COMPARING</Text>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }}>{a.first} {a.last}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>Pick a rival below</Text>
      </Grad>
      {grid.loading && <Skeleton rows={4} />}
      {grid.error && <ErrorNote error={grid.error} onRetry={grid.reload} />}
      {grid.v && (
        <View style={{ gap: 10 }}>
          {Array.from({ length: Math.ceil((grid.v.length - 1) / 2) }).map((_, row) => {
            const list = grid.v.filter((x) => x.driverId !== a.driverId).slice(row * 2, row * 2 + 2);
            return <View key={row} style={{ flexDirection: 'row', gap: 10 }}>{list.map((x) => <DriverBox key={x.driverId} height={104} d={{ ...x, number: num(x.driverId) ?? x.permNumber }} onPress={() => setB({ driverId: x.driverId, name: x.name, first: x.first, last: x.last, teamId: x.teamId, team: x.team })} />)}{list.length === 1 ? <View style={{ flex: 1 }} /> : null}</View>;
          })}
        </View>
      )}
    </Screen>
  );
  const ready = sA.v && sB.v, sa = sA.v?.stats, sb = sB.v?.stats, ca = cA.v, cb = cB.v;
  const [ahead, behind] = ready ? headToHead(sA.v.rows, sB.v.rows) : [0, 0];
  const R = (label, x, y, lower) => <Row key={label} label={label} a={x} b={y} lower={lower} ca={colA} cb={colB} />;
  return (
    <Screen header={false} swipe={{ index: tab === 'career' ? 1 : 0, count: 2, onIndex: (i) => setTab(i ? 'career' : 'season') }}>
      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8 }}>{hero(a, colA, 'left')}{hero(b, colB, 'right')}</View>
      <Pressable onPress={() => setB(null)} style={s.change}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>Change driver</Text></Pressable>
      <Segmented value={tab} onChange={setTab} items={[['season', `${YEAR} season`], ['career', 'Career']]} />
      {tab === 'season' && (
        <Card>
          {(sA.loading || sB.loading) && <Skeleton rows={5} />}
          {(sA.error || sB.error) && <ErrorNote error={sA.error || sB.error} onRetry={() => { sA.reload(); sB.reload(); }} />}
          {ready && (<>
            {R('Championship', standA ? `P${standA.position}` : '—', standB ? `P${standB.position}` : '—', true)}
            {R('Points', standA?.points ?? '—', standB?.points ?? '—')}
            {R('Wins', sa.wins, sb.wins)}{R('Podiums', sa.podiums, sb.podiums)}{R('Poles', dash(sa.poles), dash(sb.poles))}{R('Fastest laps', sa.fastest, sb.fastest)}
            {R('Points finishes', sa.pointsFinishes, sb.pointsFinishes)}{R('Avg grid', fix(sa.avgGrid), fix(sb.avgGrid), true)}{R('Avg finish', fix(sa.avgFinish), fix(sb.avgFinish), true)}
            {R('Q3 appearances', dash(sa.q3), dash(sb.q3))}{R('Not classified', sa.notClassified, sb.notClassified, true)}{R('Finished ahead', ahead, behind)}
            <Note>Finished ahead counts rounds where both raced and at least one was classified.</Note>
          </>)}
        </Card>
      )}
      {tab === 'career' && (
        <Card>
          {(cA.loading || cB.loading) && <><Skeleton rows={5} /><Note>Loading career totals. The first time can take several seconds.</Note></>}
          {(cA.error || cB.error) && <ErrorNote error={cA.error || cB.error} onRetry={() => { cA.reload(); cB.reload(); }} />}
          {ca && cb && (<>
            {R('Seasons', dash(ca.seasons), dash(cb.seasons))}{R('Races', dash(ca.races), dash(cb.races))}{R('Wins', dash(ca.wins), dash(cb.wins))}{R('Podiums', dash(ca.podiums), dash(cb.podiums))}
            {R('Poles', dash(ca.poles), dash(cb.poles))}{R('Fastest laps', dash(ca.fastest), dash(cb.fastest))}{R('Titles', tA.loading ? '…' : dash(tA.v), tB.loading ? '…' : dash(tB.v))}{R('Points', dash(ca.points), dash(cb.points))}
            <Note>A dash means that figure could not be loaded right now.</Note>
          </>)}
        </Card>
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  change: { alignSelf: 'center', paddingVertical: 4 },
  row: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, gap: 8 },
  k: { flex: 1.3, color: colors.muted, textAlign: 'center', fontSize: 14 }, v: { flex: 1, color: colors.fg, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] }, win: { color: colors.gold, fontWeight: '800' },
  bar: { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.surface2 },
});
