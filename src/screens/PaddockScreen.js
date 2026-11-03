import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import Screen, { ErrorNote } from '../components/Screen';
import { Segmented, DriverBox, TeamRow, TeamBadge, ResultLine } from '../components/Shared';
import { Eyebrow } from '../components/Screen';
import { successor } from '../data/lineage';
import { useTeamColor } from '../hooks/useTeams';
import { SearchBox } from './CompareScreen';
import { matches } from '../lib/search';
import { useAsync } from '../hooks/useAsync';
import { useFavs } from '../hooks/useFavs';
import { usePaddockMeta } from '../hooks/useTeams';
import { driverStandings, constructorStandings, lineups, allDrivers, allConstructors, driverTeamsList } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import Press from '../components/Press';
import { colors } from '../theme';

export default function PaddockScreen({ navigation }) {
  const [seg, setSeg] = useState('drivers'); const favs = useFavs(); const meta = usePaddockMeta(); const tc = useTeamColor();
  const d = useAsync(() => driverStandings(YEAR), []); const t = useAsync(() => constructorStandings(YEAR), []); const lu = useAsync(() => lineups(YEAR), []);
  const [q, setQ] = useState(''); const [kind, setKind] = useState('all'); const searching = q.trim().length >= 2;
  const everyD = useAsync(() => (searching && kind !== 'teams' ? allDrivers() : Promise.resolve(null)), [searching, kind]);
  const everyT = useAsync(() => (searching && kind !== 'drivers' ? allConstructors() : Promise.resolve(null)), [searching, kind]);
  // Search: this season's drivers and teams come first, then everyone else (names that start with the search before names that only contain it).
  const nowD = useMemo(() => new Set((d.v || []).map((x) => x.driverId)), [d.v]); const nowT = useMemo(() => new Set((t.v || []).map((x) => x.teamId)), [t.v]);
  const rank = (name, isNow) => (isNow ? 0 : 2) + (String(name).toLowerCase().split(/\s+/).some((w) => w.startsWith(q.trim().toLowerCase().split(/\s+/)[0] || '')) ? 0 : 1);
  const hitsD = useMemo(() => (searching && everyD.v ? everyD.v.filter((x) => matches(q, x.name, x.code)).sort((a, b) => rank(a.name, nowD.has(a.driverId)) - rank(b.name, nowD.has(b.driverId))).slice(0, 40) : []), [q, everyD.v, searching, nowD]);
  const hitsT = useMemo(() => (searching && everyT.v ? everyT.v.filter((x) => matches(q, x.name)).sort((a, b) => rank(a.name, nowT.has(a.teamId)) - rank(b.name, nowT.has(b.teamId))).slice(0, 40) : []), [q, everyT.v, searching, nowT]);
  // Favourites that are no longer on the grid sit under "Past seasons" below the last pair / team.
  const pastDriverIds = (favs.drivers || []).filter((id) => d.v && !nowD.has(id));
  const pastTeamIds = (favs.teams || []).filter((id) => t.v && !nowT.has(id) && !nowT.has(successor[id]));
  const pastD = useAsync(async () => {
    if (!pastDriverIds.length) return [];
    const all = await allDrivers();
    return Promise.all(pastDriverIds.map(async (id) => { const x = all.find((y) => y.driverId === id); if (!x) return null; const tl = await driverTeamsList(id).catch(() => []); return { ...x, teamId: tl[0]?.teamId, team: tl[0]?.name }; })).then((l) => l.filter(Boolean));
  }, [pastDriverIds.join(','), !!d.v]);
  const pastT = useAsync(async () => { if (!pastTeamIds.length) return []; const all = await allConstructors(); return pastTeamIds.map((id) => all.find((y) => y.teamId === id)).filter(Boolean); }, [pastTeamIds.join(','), !!t.v]);
  const st = seg === 'drivers' ? d : t; const luv = lu.v || {};
  const teams = t.v || [], drivers = d.v || [];
  // Teams in championship order, favourite teams first; each team's drivers sit side by side.
  const ordered = [...teams.filter((x) => favs.isTeam(x.teamId)), ...teams.filter((x) => !favs.isTeam(x.teamId))];
  const pos = (id) => drivers.find((x) => x.driverId === id)?.position ?? 99;
  // The two drivers who raced for the team last time, favourites first, then by championship position.
  const crew = (teamId) => [...(luv[teamId] || [])].map((x) => ({ ...x, pos: drivers.find((y) => y.driverId === x.driverId)?.position, pts: drivers.find((y) => y.driverId === x.driverId)?.points, number: meta?.drivers?.[x.driverId]?.number ?? drivers.find((y) => y.driverId === x.driverId)?.permNumber ?? null })).sort((a, b) => pos(a.driverId) - pos(b.driverId));
  const tmName = (id) => teams.find((x) => x.teamId === id)?.name;
  const openDriver = (x) => navigation.navigate('Driver', { driverId: x.driverId, name: x.name, first: x.first, last: x.last, teamId: x.teamId, team: x.team });
  const box = (x) => <DriverBox key={x.driverId} d={x} fav={favs.isDriver(x.driverId)} onPress={() => openDriver({ ...x, team: tmName(x.teamId) })} onStar={() => favs.toggleDriver(x.driverId)} />;
  return (
    <Screen swipe={{ index: seg === 'teams' ? 1 : 0, count: 2, onIndex: (i) => setSeg(i ? 'teams' : 'drivers') }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Segmented value={seg} onChange={setSeg} items={[['drivers', 'Drivers'], ['teams', 'Teams']]} /></View>
        <Pressable onPress={() => navigation.navigate('Rules')} style={({ pressed }) => [s.rules, pressed && { opacity: 0.8 }]} accessibilityLabel="F1 rules"><Ionicons name="book-outline" size={18} color={colors.accent} /><Text style={s.rulesText}>Rules</Text></Pressable>
      </View>
      <SearchBox value={q} onChange={setQ} placeholder="Search any driver or team, ever" />
      {q ? <Segmented value={kind} onChange={setKind} items={[['all', 'All'], ['drivers', 'Drivers'], ['teams', 'Teams']]} /> : null}
      {searching && (everyD.loading || everyT.loading) && <Skeleton rows={3} />}
      {searching && !everyD.loading && !everyT.loading && !hitsD.length && !hitsT.length && <Text style={{ color: colors.muted, fontSize: 15 }}>Nothing found.</Text>}
      {searching && hitsD.map((x, i) => { const cur = drivers.find((y) => y.driverId === x.driverId);
        return <ResultLine key={`d${x.driverId}`} index={i} pos={cur ? cur.position : '–'} first={x.first} last={x.last} color={cur ? tc(cur.teamId) : colors.muted} right={x.code || ''} sub={cur ? cur.team : x.nationality} photoId={x.driverId} logoId={cur?.teamId} fav={favs.isDriver(x.driverId)} onPress={() => navigation.navigate('Driver', { driverId: x.driverId, name: x.name, first: x.first, last: x.last, teamId: cur?.teamId, team: cur?.team })} />; })}
      {searching && hitsT.map((x) => (
        <Pressable key={`t${x.teamId}`} onPress={() => navigation.navigate('Team', { teamId: x.teamId, name: x.name })} style={({ pressed }) => [s.hit, pressed && { opacity: 0.7 }]}>
          <TeamBadge teamId={x.teamId} name={x.name} size={26} /><View style={{ flex: 1 }}><Text style={s.hitT}>{x.name}</Text><Text style={s.hitS}>{`Team · ${x.nationality || ''}`}</Text></View><Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>))}
      {!searching && seg === 'drivers' && (
        <Press onPress={() => navigation.navigate('Grid')}>
          <View style={{ height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent }}>
            <Ionicons name="people-outline" size={18} color={colors.accent} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>{`View the ${YEAR + 1} grid`}</Text>
          </View>
        </Press>)}
      {!searching && (st.loading || lu.loading) && <Skeleton rows={4} />}
      {st.error && <ErrorNote error={st.error} onRetry={st.reload} />}
      {!searching && seg === 'drivers' && ordered.map((tm) => {
        const ds = crew(tm.teamId);
        if (!ds.length) return null;
        return (
          <View key={tm.teamId} style={{ gap: 8 }}>
            <Pressable onPress={() => navigation.navigate('Team', { teamId: tm.teamId, name: tm.name })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.team}>{tm.name.toUpperCase()}</Text><Ionicons name="chevron-forward" size={14} color={colors.muted} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>{ds.slice(0, 2).map(box)}{ds.length === 1 ? <View style={{ flex: 1 }} /> : null}</View>
          </View>);
      })}
      {!searching && seg === 'drivers' && (pastD.v || []).length > 0 && (
        <View style={{ gap: 8 }}>
          <Eyebrow>Past seasons</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{pastD.v.map((x) => <View key={x.driverId} style={{ width: '48.5%' }}><DriverBox d={x} fav onPress={() => openDriver(x)} onStar={() => favs.toggleDriver(x.driverId)} /></View>)}</View>
        </View>)}
      {!searching && seg === 'teams' && ordered.map((x) => <TeamRow key={x.teamId} t={x} lineup={crew(x.teamId)} fav={favs.isTeam(x.teamId)} onPress={() => navigation.navigate('Team', { teamId: x.teamId, name: x.name })} onStar={() => favs.toggleTeam(x.teamId)} />)}
      {!searching && seg === 'teams' && (pastT.v || []).length > 0 && (
        <View style={{ gap: 8 }}>
          <Eyebrow>Past seasons</Eyebrow>
          {pastT.v.map((x) => <TeamRow key={x.teamId} t={{ teamId: x.teamId, name: x.name, note: 'Past seasons' }} fav onPress={() => navigation.navigate('Team', { teamId: x.teamId, name: x.name })} onStar={() => favs.toggleTeam(x.teamId)} />)}
        </View>)}
    </Screen>
  );
}
const s = StyleSheet.create({
  hit: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }, hitT: { color: colors.fg, fontSize: 18, fontWeight: '700' }, hitS: { color: colors.muted, fontSize: 14 },
  rules: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentSoft, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: colors.accent }, rulesText: { color: colors.fg, fontWeight: '700' },
  team: { color: colors.muted, fontFamily: 'label', fontSize: 12, letterSpacing: 2.2, fontWeight: '600' },
});
