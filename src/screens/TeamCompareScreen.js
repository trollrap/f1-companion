import React, { useMemo, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { Note, ErrorNote } from '../components/Screen';
import { Segmented, TeamBadge } from '../components/Shared';
import Grad from '../components/Grad';
import SeasonSwitch from '../components/SeasonSwitch';
import ExportBar from '../components/ExportBar';
import { Row, SearchBox, dash } from './CompareScreen';
import { matches } from '../lib/search';
import { useAsync } from '../hooks/useAsync';
import { useTeamColor } from '../hooks/useTeams';
import { constructorStandings, constructorSeason, constructorCareer, constructorTitles, constructorSeasonsList, allConstructors } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { colors, alpha } from '../theme';

const YEARS = (() => { const l = []; for (let y = YEAR; y >= 1958; y--) l.push(y); return l; })();
// Two teams head to head: one shared season when they have one or more, otherwise careers only.
export default function TeamCompareScreen({ route }) {
  const { a } = route.params; const year0 = route.params.year || YEAR; const tc = useTeamColor(); const shotRef = useRef(null);
  const [b, setB] = useState(null); const [tab, setTab] = useState('season'); const [gridYear, setGridYear] = useState(year0); const [q, setQ] = useState(''); const [pickYear, setPickYear] = useState(null);
  const grid = useAsync(() => constructorStandings(gridYear), [gridYear]);
  const every = useAsync(() => allConstructors(), []);
  const found = useMemo(() => (q.trim().length >= 2 && every.v ? every.v.filter((t) => t.teamId !== a.teamId && matches(q, t.name)).slice(0, 30) : []), [q, every.v]);
  const sa = useAsync(() => constructorSeasonsList(a.teamId), [a.teamId]);
  const sb = useAsync(() => (b ? constructorSeasonsList(b.teamId) : Promise.resolve(null)), [b?.teamId]);
  const common = useMemo(() => (b && sa.v && sb.v ? sa.v.filter((y) => sb.v.includes(y)) : null), [b, sa.v, sb.v]);
  const cyear = pickYear && common?.includes(pickYear) ? pickYear : common?.includes(year0) ? year0 : common?.[0] ?? null;
  const hasSeason = !!common?.length, mode = !common ? 'wait' : hasSeason ? tab : 'career';
  const stA = useAsync(() => (cyear ? constructorSeason(cyear, a.teamId) : Promise.resolve(null)), [a.teamId, cyear]);
  const stB = useAsync(() => (b && cyear ? constructorSeason(cyear, b.teamId) : Promise.resolve(null)), [b?.teamId, cyear]);
  const table = useAsync(() => (cyear ? constructorStandings(cyear) : Promise.resolve(null)), [cyear]);
  const wantC = mode === 'career'; const cA = useAsync(() => (wantC ? constructorCareer(a.teamId, YEAR) : Promise.resolve(null)), [a.teamId, wantC]); const cB = useAsync(() => (b && wantC ? constructorCareer(b.teamId, YEAR) : Promise.resolve(null)), [b?.teamId, wantC]);
  const wantT = mode === 'career'; const tA = useAsync(() => (wantT ? constructorTitles(a.teamId, YEAR) : Promise.resolve(null)), [a.teamId, wantT]); const tB = useAsync(() => (b && wantT ? constructorTitles(b.teamId, YEAR) : Promise.resolve(null)), [b?.teamId, wantT]);
  const colA = tc(a.teamId), colB = b ? tc(b.teamId) : colors.muted;
  const hero = (t, col, side) => (
    <Grad color={col} from={0.62} to={0.08} style={{ flex: 1, height: 120 }}>
      <View style={{ flex: 1, padding: 12, justifyContent: 'space-between', alignItems: side === 'left' ? 'flex-start' : 'flex-end' }}>
        <TeamBadge teamId={t.teamId} name={t.name} size={44} />
        <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700', textAlign: side }} numberOfLines={2}>{t.name}</Text>
      </View>
    </Grad>);
  if (!b) return (
    <Screen header={false}>
      <Grad color={colA} from={0.55} to={0.05} style={{ padding: 14 }}>
        <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>COMPARING</Text>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }}>{a.name}</Text>
        <Text style={{ color: colors.onSoft, fontSize: 15 }}>{year0 !== YEAR ? `Season ${year0} · pick a rival` : 'Pick a rival below'}</Text>
      </Grad>
      <SearchBox value={q} onChange={setQ} placeholder="Search any team that ever raced" />
      {q.trim().length >= 2 ? (
        <View style={{ gap: 6 }}>
          {every.loading && <Skeleton rows={3} />}
          {every.v && !found.length && <Note>No team found.</Note>}
          {found.map((t) => (
            <Pressable key={t.teamId} onPress={() => setB({ teamId: t.teamId, name: t.name })} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.7 }]}>
              <TeamBadge teamId={t.teamId} name={t.name} size={30} /><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{t.name}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{t.nationality}</Text></View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>))}
        </View>
      ) : (<>
        <SeasonSwitch compact year={gridYear} years={YEARS} onChange={setGridYear} />
        {grid.loading && <Skeleton rows={4} />}
        {grid.error && <ErrorNote error={grid.error} onRetry={grid.reload} />}
        {grid.v?.filter((x) => x.teamId !== a.teamId).map((t) => (
          <Pressable key={t.teamId} onPress={() => setB({ teamId: t.teamId, name: t.name })}>
            <Grad color={tc(t.teamId)} from={0.5} to={0.06} dir="h" radius={14} border={0.35} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TeamBadge teamId={t.teamId} name={t.name} size={34} /><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700', flex: 1 }}>{t.name}</Text><Text style={{ color: colors.muted, fontSize: 15 }}>{`P${t.position}`}</Text>
            </Grad>
          </Pressable>))}
      </>)}
    </Screen>
  );
  const ready = stA.v && stB.v, A = stA.v, B = stB.v, ca = cA.v, cb = cB.v;
  const posA = table.v?.find((x) => x.teamId === a.teamId), posB = table.v?.find((x) => x.teamId === b.teamId);
  const R = (label, x, y, lower) => <Row key={label} label={label} a={x} b={y} lower={lower} ca={colA} cb={colB} />;
  const tabs = hasSeason ? [['season', `${cyear} season`], ['career', 'History']] : null;
  return (
    <Screen header={false} swipe={tabs ? { index: mode === 'career' ? 1 : 0, count: 2, onIndex: (i) => setTab(i ? 'career' : 'season') } : undefined}>
      <View ref={shotRef} collapsable={false} style={{ gap: 10, padding: 10, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: alpha(colors.accent, 0.35) }}>
        <LinearGradient pointerEvents="none" colors={[colors.cardA, colors.deep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>{hero(a, colA, 'left')}{hero(b, colB, 'right')}</View>
        <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 11, letterSpacing: 2, textAlign: 'center' }}>{mode === 'career' ? 'HISTORY' : `${cyear} SEASON`} · F1 COMPANION</Text>
        {mode === 'wait' && <Skeleton rows={5} />}
        {mode === 'season' && (<View>
          {(stA.loading || stB.loading) && <Skeleton rows={5} />}
          {ready && (<>
            {R('Championship', posA ? `P${posA.position}` : '—', posB ? `P${posB.position}` : '—', true)}{R('Points', posA?.points ?? '—', posB?.points ?? '—')}
            {R('Wins', dash(A.wins), dash(B.wins))}{R('Podiums', dash(A.podiums), dash(B.podiums))}{R('Poles', dash(A.poles), dash(B.poles))}{R('Fastest laps', dash(A.fastest), dash(B.fastest))}
            {R('1-2 finishes', dash(A.doubles), dash(B.doubles))}{R('Races', dash(A.races), dash(B.races))}{R('DNF / NC', dash(A.dnf), dash(B.dnf), true)}
          </>)}
        </View>)}
        {mode === 'career' && (<View>
          {(cA.loading || cB.loading || !(cA.v && cB.v)) && !(ca && cb) && <Skeleton rows={5} />}
          {ca && cb && (<>
            {R('Wins', dash(ca.wins), dash(cb.wins))}{R('Poles', dash(ca.poles), dash(cb.poles))}{R('Titles', tA.loading ? '…' : dash(tA.v), tB.loading ? '…' : dash(tB.v))}{R('Seasons', dash(ca.seasons), dash(cb.seasons))}{R('First year', dash(ca.first), dash(cb.first), true)}
          </>)}
        </View>)}
      </View>
      {common && !common.length ? <Note>These two teams never raced in the same season, so their records are compared.</Note> : null}
      {tabs ? <Segmented value={mode} onChange={setTab} items={tabs} /> : null}
      {common && common.length > 1 && mode === 'season' ? <SeasonSwitch compact year={cyear} years={common} onChange={setPickYear} caption="seasons they shared" /> : null}
      <Pressable onPress={() => { setB(null); setPickYear(null); }} style={{ alignSelf: 'center', paddingVertical: 4 }}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>Change team</Text></Pressable>
      <ExportBar target={shotRef} />
    </Screen>
  );
}
