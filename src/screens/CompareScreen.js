import React, { useMemo, useRef, useState } from 'react';
import { View, Pressable, Image, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import { DriverBox, Segmented } from '../components/Shared';
import Grad, { Scrim } from '../components/Grad';
import SeasonSwitch from '../components/SeasonSwitch';
import { tr } from '../lib/i18n';
import ExportBar from '../components/ExportBar';
import { driverPhoto } from '../lib/media';
import { matches } from '../lib/search';
import { useAsync } from '../hooks/useAsync';
import { useTeamColor } from '../hooks/useTeams';
import { driverStandings, driverSeasonResults, driverSeasonQuali, driverCareer, driverTitles, driverSeasons, allDrivers } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { seasonStats, headToHead, fix } from '../lib/stats';
import { colors, alpha } from '../theme';

// A row with the two values and a tug-of-war bar. lower: true means the smaller number wins.
export function Row({ label, a, b, lower, ca, cb }) {
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
export const dash = (v) => (v == null ? '—' : v);
const YEARS = (() => { const l = []; for (let y = YEAR; y >= 1950; y--) l.push(y); return l; })();

// Search box shared by the pickers: shows the matches for the query, or nothing when empty.
export function SearchBox({ value, onChange, placeholder }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, paddingHorizontal: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput value={value} onChangeText={onChange} placeholder={tr(placeholder)} placeholderTextColor={colors.muted} autoCorrect={false} autoCapitalize="none" style={{ flex: 1, color: colors.fg, fontSize: 17, padding: 0 }} />
      {value ? <Pressable onPress={() => onChange('')} hitSlop={10}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
    </View>
  );
}

export default function CompareScreen({ route }) {
  const { a } = route.params; const year0 = route.params.year || YEAR;
  const [b, setB] = useState(null); const [tab, setTab] = useState('season'); const [gridYear, setGridYear] = useState(year0); const [q, setQ] = useState(''); const [pickYear, setPickYear] = useState(null);
  const tc = useTeamColor(); const shotRef = useRef(null);
  const grid = useAsync(() => driverStandings(gridYear), [gridYear]);
  const every = useAsync(() => allDrivers(), []);
  const found = useMemo(() => (q.trim().length >= 2 && every.v ? every.v.filter((d) => d.driverId !== a.driverId && matches(q, d.name, d.code)).slice(0, 30) : []), [q, every.v]);
  const pickB = (x) => setB({ driverId: x.driverId, name: x.name, first: x.first, last: x.last, teamId: x.teamId || null, team: x.team || null, number: x.number || x.permNumber });
  // seasons both drivers raced in
  const nowStand = useAsync(() => driverStandings(YEAR), []);
  const sa = useAsync(() => driverSeasons(a.driverId), [a.driverId]);
  const sb = useAsync(() => (b ? driverSeasons(b.driverId) : Promise.resolve(null)), [b?.driverId]);
  const common = useMemo(() => {
    if (!b || !sa.v || !sb.v) return null; const cur = (id) => (nowStand.v?.some((x) => x.driverId === id) ? [YEAR] : []);
    const A = new Set([...sa.v, ...cur(a.driverId)]), B = new Set([...sb.v, ...cur(b.driverId)]);
    return [...A].filter((y) => B.has(y)).sort((x, y) => y - x);
  }, [b, sa.v, sb.v, nowStand.v]);
  const cyear = pickYear && common?.includes(pickYear) ? pickYear : common?.includes(year0) ? year0 : common?.[0] ?? null;
  const hasSeason = !!common?.length, mode = hasSeason ? tab : 'career';
  const loadSeason = async (id, y) => { const rows = await driverSeasonResults(y, id); const qq = await driverSeasonQuali(y, id).catch(() => ({ poles: null, q3: null })); return { rows, stats: seasonStats(rows, qq.poles, qq.q3) }; };
  const seasonA = useAsync(() => (cyear ? loadSeason(a.driverId, cyear) : Promise.resolve(null)), [a.driverId, cyear]);
  const seasonB = useAsync(() => (b && cyear ? loadSeason(b.driverId, cyear) : Promise.resolve(null)), [b?.driverId, cyear]);
  const tableY = useAsync(() => (cyear ? driverStandings(cyear) : Promise.resolve(null)), [cyear]);
  const cA = useAsync(() => driverCareer(a.driverId, YEAR), [a.driverId]);
  const cB = useAsync(() => (b ? driverCareer(b.driverId, YEAR) : Promise.resolve(null)), [b?.driverId]);
  const tA = useAsync(() => driverTitles(a.driverId, YEAR), [a.driverId]);
  const tB = useAsync(() => (b ? driverTitles(b.driverId, YEAR) : Promise.resolve(null)), [b?.driverId]);
  const teamOf = (S, d) => S?.rows?.at(-1)?.teamId || d.teamId;
  const colA = tc(teamOf(seasonA.v, a)), colB = b ? tc(teamOf(seasonB.v, b) || b.teamId) : colors.muted;
  const numOf = (d) => (tableY.v?.find((x) => x.driverId === d.driverId)?.permNumber) ?? d.number ?? '';
  const hero = (d, col, side) => { const photo = driverPhoto(d.driverId), left = side === 'left'; return (
    <Grad color={col} from={0.62} to={0.08} style={{ flex: 1, height: 132 }}>
      {photo ? <Image source={photo} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', bottom: -14, [left ? 'right' : 'left']: -22, width: 128, height: 128 }} /> : null}
      {photo ? <Scrim dir="v" from={0} to={0.8} style={{ top: '40%' }} /> : null}
      <View style={{ flex: 1, padding: 12 }}>
        <Text style={{ fontFamily: 'display', fontWeight: '800', fontSize: 28, color: colors.fg, textAlign: side }}>{numOf(d)}</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: side }} numberOfLines={1}>{d.first}</Text>
        <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700', textAlign: side }} numberOfLines={1}>{d.last}</Text>
      </View>
    </Grad>); };
  if (!b) return (
    <Screen header={false}>
      <Grad color={tc(a.teamId)} from={0.55} to={0.05} style={{ padding: 14 }}>
        <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>COMPARING</Text>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }}>{a.first} {a.last}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>{year0 !== YEAR ? `Season ${year0} · pick a rival` : 'Pick a rival below'}</Text>
      </Grad>
      <SearchBox value={q} onChange={setQ} placeholder="Search any driver who ever raced" />
      {q.trim().length >= 2 ? (
        <View style={{ gap: 6 }}>
          {every.loading && <Skeleton rows={3} />}
          {every.v && !found.length && <Note>No driver found.</Note>}
          {found.map((d) => (
            <Pressable key={d.driverId} onPress={() => pickB(d)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.7 }]}>
              <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{d.name}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{d.nationality}{d.code ? ` · ${d.code}` : ''}</Text></View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>))}
        </View>
      ) : (<>
        <SeasonSwitch compact year={gridYear} years={YEARS} onChange={setGridYear} />
        {grid.loading && <Skeleton rows={4} />}
        {grid.error && <ErrorNote error={grid.error} onRetry={grid.reload} />}
        {grid.v && (
          <View style={{ gap: 10 }}>
            {Array.from({ length: Math.ceil(grid.v.filter((x) => x.driverId !== a.driverId).length / 2) }).map((_, row) => {
              const list = grid.v.filter((x) => x.driverId !== a.driverId).slice(row * 2, row * 2 + 2);
              return <View key={row} style={{ flexDirection: 'row', gap: 10 }}>{list.map((x) => <DriverBox key={x.driverId} height={104} d={{ ...x, number: x.permNumber }} onPress={() => pickB(x)} />)}{list.length === 1 ? <View style={{ flex: 1 }} /> : null}</View>;
            })}
          </View>)}
      </>)}
    </Screen>
  );
  const ready = seasonA.v && seasonB.v, S1 = seasonA.v?.stats, S2 = seasonB.v?.stats, ca = cA.v, cb = cB.v;
  const [ahead, behind] = ready ? headToHead(seasonA.v.rows, seasonB.v.rows) : [0, 0];
  const standA = tableY.v?.find((x) => x.driverId === a.driverId), standB = tableY.v?.find((x) => x.driverId === b.driverId);
  const R = (label, x, y, lower) => <Row key={label} label={label} a={x} b={y} lower={lower} ca={colA} cb={colB} />;
  const tabs = hasSeason ? [['season', `${cyear} season`], ['career', 'Career']] : null;
  return (
    <Screen header={false} swipe={tabs ? { index: mode === 'career' ? 1 : 0, count: 2, onIndex: (i) => setTab(i ? 'career' : 'season') } : undefined}>
      <View ref={shotRef} collapsable={false} style={{ gap: 10, padding: 10, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: alpha(colors.accent, 0.35) }}>
        <LinearGradient pointerEvents="none" colors={['#2A1318', '#0A0506']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20 }} />
        <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8 }}>{hero(a, colA, 'left')}{hero(b, colB, 'right')}</View>
        <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 11, letterSpacing: 2, textAlign: 'center' }}>{mode === 'career' ? 'CAREER' : `${cyear} SEASON`} · F1 COMPANION</Text>
        {mode === 'season' && (
          <View>
            {(seasonA.loading || seasonB.loading) && <Skeleton rows={5} />}
            {(seasonA.error || seasonB.error) && <ErrorNote error={seasonA.error || seasonB.error} onRetry={() => { seasonA.reload(); seasonB.reload(); }} />}
            {ready && (<>
              {R('Championship', standA ? `P${standA.position}` : '—', standB ? `P${standB.position}` : '—', true)}
              {R('Points', standA?.points ?? '—', standB?.points ?? '—')}
              {R('Wins', S1.wins, S2.wins)}{R('Podiums', S1.podiums, S2.podiums)}{R('Poles', dash(S1.poles), dash(S2.poles))}{R('Fastest laps', S1.fastest, S2.fastest)}
              {R('Points finishes', S1.pointsFinishes, S2.pointsFinishes)}{R('Avg grid', fix(S1.avgGrid), fix(S2.avgGrid), true)}{R('Avg finish', fix(S1.avgFinish), fix(S2.avgFinish), true)}
              {R('Q3 appearances', dash(S1.q3), dash(S2.q3))}{R('Not classified', S1.notClassified, S2.notClassified, true)}{R('Finished ahead', ahead, behind)}
            </>)}
          </View>)}
        {mode === 'career' && (
          <View>
            {(cA.loading || cB.loading) && <Skeleton rows={5} />}
            {(cA.error || cB.error) && <ErrorNote error={cA.error || cB.error} onRetry={() => { cA.reload(); cB.reload(); }} />}
            {ca && cb && (<>
              {R('Seasons', dash(ca.seasons), dash(cb.seasons))}{R('Races', dash(ca.races), dash(cb.races))}{R('Wins', dash(ca.wins), dash(cb.wins))}{R('Podiums', dash(ca.podiums), dash(cb.podiums))}
              {R('Poles', dash(ca.poles), dash(cb.poles))}{R('Fastest laps', dash(ca.fastest), dash(cb.fastest))}{R('Titles', tA.loading ? '…' : dash(tA.v), tB.loading ? '…' : dash(tB.v))}{R('Points', dash(ca.points), dash(cb.points))}
            </>)}
          </View>)}
      </View>
      {common && !common.length ? <Note>These two never raced in the same season, so their careers are compared.</Note> : null}
      {tabs ? <Segmented value={mode} onChange={setTab} items={tabs} /> : null}
      {common && common.length > 1 && mode === 'season' ? <SeasonSwitch compact year={cyear} years={common} onChange={setPickYear} caption="seasons they shared" /> : null}
      <Pressable onPress={() => { setB(null); setPickYear(null); }} style={s.change}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>Change driver</Text></Pressable>
      <ExportBar target={shotRef} />
    </Screen>
  );
}
const s = StyleSheet.create({
  change: { alignSelf: 'center', paddingVertical: 4 },
  row: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, gap: 8 },
  k: { flex: 1.3, color: colors.muted, textAlign: 'center', fontSize: 14 }, v: { flex: 1, color: colors.fg, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] }, win: { color: colors.gold, fontWeight: '800' },
  bar: { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.surface2 },
});
