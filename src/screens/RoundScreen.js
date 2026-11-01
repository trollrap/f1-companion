import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import { ResultRow, ResultLine, CircuitBox, driverParams } from '../components/Shared';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import TrackMap from '../components/TrackMap';
import { useOutline } from '../lib/outlines';
import { usePrefs } from '../hooks/usePrefs';
import { parseGap, aheadList } from '../lib/gaps';
import Dropdown from '../components/Dropdown';
import Grad from '../components/Grad';
import Press from '../components/Press';
import { SprintBadge, Pill } from '../components/Badge';
import Schedule from '../components/Schedule';
import Strategy from '../components/Strategy';
import { sessionResults, driverStandings } from '../api/jolpica';
import { norm } from '../lib/names';
import { useAsync } from '../hooks/useAsync';
import { sessionClassification, YEAR } from '../api/openf1';
import { sessionsOf } from '../api/season';
import { useNow } from '../hooks/useSeason';
import { useTeamColor, usePaddockMeta } from '../hooks/useTeams';
import { useFavs } from '../hooks/useFavs';
import { colors } from '../theme';
import { dateRange, shortName, flag } from '../lib/time';

const KIND = { Race: 'results', Qualifying: 'qualifying', Sprint: 'sprint' };
export default function RoundScreen({ route, navigation }) {
  const { meeting } = route.params; const now = useNow(60000); const outline = useOutline(meeting.circuit_key); const { prefs } = usePrefs(); const [gapMode, setGapMode] = useState(prefs.opts.gap === 'ahead' ? 'ahead' : 'leader'); const tc = useTeamColor(); const favs = useFavs(); const meta = usePaddockMeta();
  const stand = useAsync(() => driverStandings(YEAR), []);
  // Practice rows come from OpenF1 (no Jolpica id). Match them to the standings by car number, then surname.
  // A reserve driver is not in the standings: open a profile from the name alone (it shows what exists for that driver).
  const matchTiming = (r) => stand.v?.find((x) => String(meta?.drivers?.[x.driverId]?.number) === String(r.number)) || stand.v?.find((x) => norm(x.last) === norm(r.last)) || null;
  const openTiming = (r) => { const m = matchTiming(r); navigation.navigate('Driver', m ? { ...driverParams(m), color: r.color } : { driverId: norm(r.last).replace(/[^a-z0-9]+/g, '_'), name: r.driver, first: r.first, last: r.last, teamId: null, team: r.team, color: r.color }); };
  const done = Date.parse(meeting.date_end) < now;
  const [showStrat, setShowStrat] = useState(false); const [sessions, setSessions] = useState([]); const [sel, setSel] = useState(null); const [res, setRes] = useState({ loading: true });
  useEffect(() => { sessionsOf(meeting).then(setSessions).catch(() => {}); }, []);
  // Results can be opened for every session that has finished, even while the weekend is still going.
  const ended = sessions.filter((x) => Date.parse(x.date_end) < now);
  const names = ended.map((x) => x.session_name); const cur = sel && names.includes(sel) ? sel : names.includes('Race') ? 'Race' : names.at(-1);
  useEffect(() => {
    if (!cur) return; setRes({ loading: true });
    const kind = KIND[cur];
    if (kind) { sessionResults(YEAR, meeting.round, kind).then((v) => setRes({ v })).catch((e) => setRes({ error: String(e.message || e) })); return; }
    const sess = sessions.find((x) => x.session_name === cur);
    if (!sess) { setRes({ note: 'This session is not in the schedule data.' }); return; }
    sessionClassification(sess.session_key).then((v) => setRes({ timing: v })).catch((e) => setRes({ error: String(e.message || e) }));
  }, [cur, sessions.length]);
  // Gap display: race and sprint rows (Jolpica) and timing rows (OpenF1) carry gaps to the leader; "ahead" turns them into gaps to the car in front.
  // Qualifying: the gap is measured inside the same stage (Q3 against the Q3 pole time, Q2 against the fastest Q2 time, ...).
  const secs = (x) => { const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(String(x || '').trim()); return m ? Number(m[1] || 0) * 60 + Number(m[2]) : null; };
  const stageOf = (r) => (r.q3 ? 'q3' : r.q2 ? 'q2' : 'q1');
  const qualiRows = res.v && cur === 'Qualifying' ? res.v.map((r, i, all) => {
    const stg = stageOf(r), t0 = secs(r[stg]), lead = all.find((x) => stageOf(x) === stg), prev = i > 0 && stageOf(all[i - 1]) === stg ? all[i - 1] : lead;
    const ref = secs((gapMode === 'ahead' ? prev : lead)?.[stg]);
    return { ...r, stg: stg.toUpperCase(), gap: t0 != null && ref != null && ref !== t0 ? `+${(t0 - ref).toFixed(3)}` : null, best: r[stg] };
  }) : null;
  const raceRows = res.v && cur !== 'Qualifying' ? res.v : null;
  const canGap = !!(qualiRows || (raceRows && raceRows.some((r) => parseGap(r.time) != null)) || (res.timing && res.timing.some((r) => parseGap(r.gap) != null)));
  const raceShown = raceRows ? (gapMode === 'ahead' ? aheadList(raceRows.map((r) => r.time)).map((t, i) => ({ ...raceRows[i], time: t })) : raceRows) : null;
  const timingShown = res.timing ? (gapMode === 'ahead' ? aheadList(res.timing.map((r) => r.gap)).map((g, i) => ({ ...res.timing[i], gap: g })) : res.timing) : null;
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.3} to={0.03} border={0.4} style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={s.gp} numberOfLines={1}>{flag(meeting.country_code)} {shortName(meeting.meeting_name)}</Text>{meeting.has_sprint ? <SprintBadge /> : null}</View>
        <Text style={s.meta}>{dateRange(meeting)}</Text>
        <View style={{ marginTop: 8 }}><Pill color={done ? colors.good : colors.accent}>{done ? 'Completed' : ended.length ? 'In progress' : 'Upcoming'}</Pill></View>
        {outline ? <View pointerEvents="none" style={{ position: 'absolute', right: 8, top: 6, bottom: 6, justifyContent: 'center' }}><TrackMap pts={outline} width={132} height={92} stroke={2.6} /></View> : null}
      </Grad>
      {ended.length > 0 && (
        <Card>
          <Eyebrow>Results</Eyebrow>
          <View style={{ marginTop: 12 }}><Dropdown value={cur} options={names.map((n) => [n, n])} onChange={(v) => { setShowStrat(false); setSel(v); }} /></View>
          {canGap ? (
            <Pressable onPress={() => setGapMode(gapMode === 'leader' ? 'ahead' : 'leader')} hitSlop={8} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="swap-vertical" size={16} color={colors.accent} /><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>{gapMode === 'leader' ? 'Gap to leader' : 'Gap to car ahead'}</Text>
            </Pressable>) : null}
          {res.loading && <Skeleton />}
          {res.error && <Note>Results unavailable: {res.error}</Note>}{res.note && <Note>{res.note}</Note>}
          <View style={{ marginTop: 6 }}>
            {timingShown && (timingShown.length ? timingShown.map((r, i) => <ResultLine index={i} key={r.position + r.driver} pos={r.position} first={r.first} last={r.last} color={r.color || colors.muted} right={r.time} sub={r.team ? (r.gap ? `${r.gap}` : r.team) : r.gap} logoId={matchTiming(r)?.teamId} photoId={matchTiming(r)?.driverId} fav={!!matchTiming(r) && favs.isDriver(matchTiming(r).driverId)} onPress={() => openTiming(r)} />) : <Note>No classification published for this session.</Note>)}
            {res.v && (cur === 'Qualifying'
              ? qualiRows.map((r, i) => <ResultLine index={i} key={r.position} pos={r.position} first={r.first} last={r.last} color={tc(r.teamId)} fav={favs.isDriver(r.driverId)} right={r.q3 || r.q2 || r.q1 || '—'} sub={r.gap ? `${r.stg} · ${r.gap}` : r.stg} logoId={r.teamId} photoId={r.driverId} onPress={() => navigation.navigate('Driver', driverParams({ ...r, name: r.driver }))} />)
              : raceShown.map((r, i) => <ResultRow key={r.position} r={r} index={i} />))}
          </View>
        </Card>
      )}
      {(cur === 'Race' || cur === 'Sprint') && sessions.find((x) => x.session_name === cur && x.session_key) ? (
        showStrat ? <Strategy key={cur} sessionKey={sessions.find((x) => x.session_name === cur).session_key} />
          : <Press onPress={() => setShowStrat(true)}><View style={{ height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent }}><Ionicons name="color-fill-outline" size={18} color={colors.accent} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>{`Show tyre strategy (${cur.toLowerCase()})`}</Text></View></Press>) : null}
      {!done && <Card><Eyebrow>Schedule</Eyebrow>{sessions.length ? <Schedule sessions={sessions} now={now} off={null} /> : <Note>Session times appear here once they are published.</Note>}</Card>}
      <CircuitBox meeting={meeting} />
    </Screen>
  );
}
const s = StyleSheet.create({ gp: { color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic', flexShrink: 1 }, meta: { color: colors.muted, fontSize: 16 } });
