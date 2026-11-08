import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, findNodeHandle } from 'react-native';
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
import NextSession from '../components/NextSession';
import Strategy from '../components/Strategy';
import { sessionResults, driverStandings } from '../api/jolpica';
import { norm } from '../lib/names';
import { useAsync } from '../hooks/useAsync';
import { sessionClassification, findSessionKey, racePenalties, YEAR } from '../api/openf1';
import { sessionsOf } from '../api/season';
import { useNow } from '../hooks/useSeason';
import { useTeamColor, usePaddockMeta } from '../hooks/useTeams';
import { useFavs } from '../hooks/useFavs';
import { colors } from '../theme';
import { dateRange, shortName, flag } from '../lib/time';

const KIND = { Race: 'results', Qualifying: 'qualifying', Sprint: 'sprint' };
export default function RoundScreen({ route, navigation }) {
  const { meeting } = route.params; const now = useNow(60000); const outline = useOutline(meeting.circuit_key); const { prefs, setOpt } = usePrefs(); const [gapMode, setGapMode] = useState(prefs.opts.gap === 'ahead' ? 'ahead' : 'leader'); const tc = useTeamColor(); const favs = useFavs(); const meta = usePaddockMeta();
  const year = meeting.year || YEAR; const stand = useAsync(() => driverStandings(year), [year]);
  // Practice rows come from OpenF1 (no Jolpica id). Match them to the standings by car number, then surname.
  // A reserve driver is not in the standings: open a profile from the name alone (it shows what exists for that driver).
  const matchTiming = (r) => stand.v?.find((x) => String(meta?.drivers?.[x.driverId]?.number) === String(r.number)) || stand.v?.find((x) => norm(x.last) === norm(r.last)) || null;
  const openTiming = (r) => { const m = matchTiming(r); navigation.navigate('Driver', m ? { ...driverParams(m, year), color: r.color } : { driverId: norm(r.last).replace(/[^a-z0-9]+/g, '_'), name: r.driver, first: r.first, last: r.last, teamId: null, team: r.team, color: r.color }); };
  const done = Date.parse(meeting.date_end) < now;
  const [showStrat, setShowStrat] = useState(false); const [sessions, setSessions] = useState([]); const [sel, setSel] = useState(route.params.session || null); const [res, setRes] = useState({ loading: true });
  // Old seasons only publish the race date, so the weekend is rebuilt from what the results archive holds: race, qualifying (since 1994) and a sprint when there was one.
  useEffect(() => {
    sessionsOf(meeting).then((l) => {
      if (!Array.isArray(l)) { setSessions([]); return; }
      if (l.length || year >= YEAR) { setSessions(l); return; }
      const end = meeting.date_end, mk = (n) => ({ session_name: n, date_start: meeting.date_start, date_end: end, end_estimated: true });
      setSessions([...(year >= 1994 ? [mk('Qualifying')] : []), ...(meeting.has_sprint ? [mk('Sprint')] : []), mk('Race')]);
    }).catch(() => {});
  }, []);
  // Results can be opened for every session that has finished, even while the weekend is still going.
  // Once qualifying is over the Race entry is already there and shows the starting grid (qualifying order with the stewards' grid penalties); the same goes for the Sprint after Sprint Qualifying.
  const ended = sessions.filter((x) => Date.parse(x.date_end) < now); const hasEnded = (n) => ended.some((x) => x.session_name === n);
  const gridRace = !hasEnded('Race') && hasEnded('Qualifying'), gridSprint = !hasEnded('Sprint') && hasEnded('Sprint Qualifying') && sessions.some((x) => x.session_name === 'Sprint');
  const order = sessions.map((x) => x.session_name);
  const names = [...ended.map((x) => x.session_name), ...(gridSprint ? ['Sprint'] : []), ...(gridRace ? ['Race'] : [])].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const cur = sel && names.includes(sel) ? sel : names.includes('Race') ? 'Race' : names.at(-1);
  const isGrid = (cur === 'Race' && gridRace) || (cur === 'Sprint' && gridSprint);
  const labelOf = (n) => ((n === 'Race' && gridRace) || (n === 'Sprint' && gridSprint) ? `${n} · starting grid` : n);
  const sessOf = (n) => sessions.find((x) => x.session_name === n);
  // Penalties from the stewards (race control messages), matched to drivers by car number. Only seasons OpenF1 covers (2023 on) have them.
  const [pens, setPens] = useState([]);
  useEffect(() => {
    setPens([]); const target = (cur === 'Sprint' || cur === 'Race') ? sessOf(cur) : null; if (!target) return; let dead = false;
    (async () => {
      const key = target.session_key || await findSessionKey(year, cur, target.date_start).catch(() => null);
      if (key) { const p = await racePenalties(key).catch(() => []); if (!dead) setPens(p); }
    })();
    return () => { dead = true; };
  }, [cur, sessions.length]);
  const numberOf = (driverId) => meta?.drivers?.[driverId]?.number ?? stand.v?.find((x) => x.driverId === driverId)?.permNumber;
  const tagsOf = (driverId, grid) => { const n = Number(numberOf(driverId)); if (!n) return []; return pens.filter((p) => p.number === n && (grid ? ['grid', 'back', 'pit'].includes(p.kind) : true)).map((p) => ({ text: p.text })); };
  useEffect(() => {
    if (!cur) return; setRes({ loading: true });
    if (isGrid && cur === 'Race') { sessionResults(year, meeting.round, 'qualifying').then((v) => (v ? setRes({ v, grid: true }) : setRes({ note: 'Qualifying results are not archived yet.' }))).catch((e) => setRes({ error: String(e.message || e) })); return; }
    if (isGrid && cur === 'Sprint') { const sq = sessOf('Sprint Qualifying'); if (!sq) { setRes({ note: 'This session is not in the schedule data.' }); return; } sessionClassification(sq.session_key).then((v) => setRes({ timing: v, grid: true })).catch((e) => setRes({ error: String(e.message || e) })); return; }
    const kind = KIND[cur];
    if (kind) { sessionResults(year, meeting.round, kind).then((v) => (v ? setRes({ v }) : setRes({ note: 'No results are archived for this session.' }))).catch((e) => setRes({ error: String(e.message || e) })); return; }
    const sess = sessions.find((x) => x.session_name === cur);
    if (!sess) { setRes({ note: 'This session is not in the schedule data.' }); return; }
    sessionClassification(sess.session_key).then((v) => setRes({ timing: v })).catch((e) => setRes({ error: String(e.message || e) }));
  }, [cur, sessions.length]);
  // Race grid = qualifying order, with grid penalties applied in the order they were announced.
  const gridRows = isGrid && cur === 'Race' && res.v ? (() => {
    const list = res.v.map((r) => ({ ...r, quali: r.position })); const out = [...list];
    pens.filter((p) => ['grid', 'back', 'pit'].includes(p.kind)).forEach((p) => {
      const i = out.findIndex((r) => Number(numberOf(r.driverId)) === p.number); if (i < 0) return;
      const [r] = out.splice(i, 1); out.splice(p.kind === 'grid' ? Math.min(out.length, i + p.places) : out.length, 0, { ...r, penalised: true, pit: p.kind === 'pit' });
    });
    return out.map((r, i) => ({ ...r, slot: i + 1 }));
  })() : null;
  // Scroll to the driver who was tapped in a past season list, then make his row flash once.
  const scroller = useRef(null); const focusRow = useRef(null); const focusId = route.params.focusDriverId; const [flashId, setFlashId] = useState(null); const focused = useRef(false);
  useEffect(() => {
    if (!focusId || focused.current || res.loading || !res.v || cur !== 'Race' || isGrid) return;
    if (!res.v.some((r) => r.driverId === focusId)) return; focused.current = true;
    const timer = setTimeout(() => {
      const go = (y) => { scroller.current?.scrollTo({ y: Math.max(0, y - 150), animated: true }); setTimeout(() => setFlashId(focusId), 520); };
      try {
        const inner = scroller.current?.getInnerViewRef?.() || findNodeHandle(scroller.current);
        focusRow.current?.measureLayout(inner, (x, y) => go(y), () => setFlashId(focusId));
      } catch { setFlashId(focusId); }
    }, 900);
    return () => clearTimeout(timer);
  }, [res.v, cur]);

  // Gap display: race and sprint rows (Jolpica) and timing rows (OpenF1) carry gaps to the leader; "ahead" turns them into gaps to the car in front.
  // Qualifying: the gap is measured inside the same stage (Q3 against the Q3 pole time, Q2 against the fastest Q2 time, ...).
  const secs = (x) => { const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(String(x || '').trim()); return m ? Number(m[1] || 0) * 60 + Number(m[2]) : null; };
  const stageOf = (r) => (r.q3 ? 'q3' : r.q2 ? 'q2' : 'q1');
  const qualiRows = res.v && !res.grid && cur === 'Qualifying' ? res.v.map((r, i, all) => {
    const stg = stageOf(r), t0 = secs(r[stg]), lead = all.find((x) => stageOf(x) === stg), prev = i > 0 && stageOf(all[i - 1]) === stg ? all[i - 1] : lead;
    const ref = secs((gapMode === 'ahead' ? prev : lead)?.[stg]);
    return { ...r, stg: stg.toUpperCase(), gap: t0 != null && ref != null && ref !== t0 ? `+${(t0 - ref).toFixed(3)}` : null, best: r[stg] };
  }) : null;
  const raceRows = res.v && !res.grid && cur !== 'Qualifying' ? res.v : null;
  const canGap = !res.grid && !!(qualiRows || (raceRows && raceRows.some((r) => parseGap(r.time) != null)) || (res.timing && !res.grid && res.timing.some((r) => parseGap(r.gap) != null)));
  const raceShown = raceRows ? (gapMode === 'ahead' ? aheadList(raceRows.map((r) => r.time)).map((t, i) => ({ ...raceRows[i], time: t })) : raceRows) : null;
  const timingShown = res.timing ? (gapMode === 'ahead' ? aheadList(res.timing.map((r) => r.gap)).map((g, i) => ({ ...res.timing[i], gap: g })) : res.timing) : null;
  return (
    <Screen header={false} scrollRef={scroller}>
      <Grad color={colors.accent} from={0.3} to={0.03} border={0.4} style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={s.gp} numberOfLines={1}>{flag(meeting.country_code)} {shortName(meeting.meeting_name)}</Text>{meeting.has_sprint ? <SprintBadge /> : null}</View>
        <Text style={s.meta}>{dateRange(meeting)}</Text>
        <View style={{ marginTop: 8 }}><Pill color={done ? colors.good : colors.accent}>{done ? 'Completed' : ended.length ? 'In progress' : 'Upcoming'}</Pill></View>
        {outline ? <View pointerEvents="none" style={{ position: 'absolute', right: 8, top: 6, bottom: 6, justifyContent: 'center' }}><TrackMap pts={outline} width={132} height={92} stroke={2.6} /></View> : null}
      </Grad>
      {!done && sessions.length > 0 && <NextSession sessions={sessions} now={now} off={null} />}
      {ended.length > 0 && (
        <Card>
          <Eyebrow>Results</Eyebrow>
          <View style={{ marginTop: 12 }}><Dropdown value={cur} options={names.map((n) => [n, labelOf(n)])} onChange={(v) => { setShowStrat(false); setSel(v); }} /></View>
          {canGap ? (
            <Pressable onPress={() => { const k = gapMode === 'leader' ? 'ahead' : 'leader'; setGapMode(k); setOpt('gap', k); }} hitSlop={8} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="swap-vertical" size={16} color={colors.accent} /><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>{gapMode === 'leader' ? 'Gap to leader' : 'Interval'}</Text>
            </Pressable>) : null}
          {res.loading && <Skeleton />}
          {res.error && <Note>Results unavailable: {res.error}</Note>}{res.note && <Note>{res.note}</Note>}
          <View style={{ marginTop: 6 }}>
            {timingShown && (timingShown.length ? timingShown.map((r, i) => <ResultLine index={i} key={r.position + r.driver} pos={r.position} first={r.first} last={r.last} color={r.color || colors.muted} right={r.time} sub={r.team ? (r.gap ? `${r.gap}` : r.team) : r.gap} logoId={matchTiming(r)?.teamId} photoId={matchTiming(r)?.driverId} fav={!!matchTiming(r) && favs.isDriver(matchTiming(r).driverId)} onPress={() => openTiming(r)} />) : <Note>No classification published for this session.</Note>)}
            {isGrid && cur === 'Race' && res.v && <Note>{pens.some((p) => ['grid', 'back', 'pit'].includes(p.kind)) ? 'Starting grid: qualifying order with the stewards\u2019 grid penalties applied.' : 'Starting grid: qualifying order. Grid penalties, if any, appear here once the stewards announce them.'}</Note>}
            {gridRows && gridRows.map((r, i) => <ResultLine index={i} key={r.driverId || r.slot} pos={r.slot} first={r.first} last={r.last} color={tc(r.teamId)} fav={favs.isDriver(r.driverId)} right={r.pit ? 'Pit lane' : r.q3 || r.q2 || r.q1 || '—'} sub={r.quali !== r.slot ? `Qualified P${r.quali}` : r.q3 ? 'Q3' : r.q2 ? 'Q2' : 'Q1'} tags={tagsOf(r.driverId, true)} logoId={r.teamId} photoId={r.driverId} onPress={() => navigation.navigate('Driver', driverParams({ ...r, name: r.driver }, year))} />)}
            {res.v && !gridRows && !res.grid && (cur === 'Qualifying'
              ? (qualiRows || []).map((r, i) => <ResultLine index={i} key={r.position} pos={r.position} first={r.first} last={r.last} color={tc(r.teamId)} fav={favs.isDriver(r.driverId)} right={r.q3 || r.q2 || r.q1 || '—'} sub={r.gap ? `${r.stg} · ${r.gap}` : r.stg} logoId={r.teamId} photoId={r.driverId} onPress={() => navigation.navigate('Driver', driverParams({ ...r, name: r.driver }, year))} />)
              : (raceShown || []).map((r, i) => <ResultRow key={r.position} r={r} year={year} index={i} tags={tagsOf(r.driverId, false)} flash={flashId === r.driverId} rowRef={focusId === r.driverId ? focusRow : undefined} />))}
          </View>
        </Card>
      )}
      {(cur === 'Race' || cur === 'Sprint') && !isGrid && sessions.find((x) => x.session_name === cur && x.session_key) ? (
        showStrat ? <Strategy key={cur} sessionKey={sessions.find((x) => x.session_name === cur).session_key} onHide={() => setShowStrat(false)} />
          : <Press onPress={() => setShowStrat(true)}><View style={{ height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent }}><Ionicons name="color-fill-outline" size={18} color={colors.accent} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>{`Show tire strategy (${cur.toLowerCase()})`}</Text></View></Press>) : null}
      {!done && <Card><Eyebrow>Schedule</Eyebrow>{sessions.length ? <Schedule sessions={sessions} now={now} off={null} /> : <Note>Session times appear here once they are published.</Note>}</Card>}
      <CircuitBox meeting={meeting} />
    </Screen>
  );
}
const s = StyleSheet.create({ gp: { color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic', flexShrink: 1 }, meta: { color: colors.muted, fontSize: 16 } });
