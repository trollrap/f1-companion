import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import Dropdown from '../components/Dropdown';
import SeasonSwitch from '../components/SeasonSwitch';
import Grad from '../components/Grad';
import Press from '../components/Press';
import { Pill } from '../components/Badge';
import { Segmented, Countdown } from '../components/Shared';
import { hm, dayName } from '../lib/time';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useSeason';
import { seasons, events, categories, sessions, classification, standings, lastRace, flagOf, mgDate, groupStandings, riderSeason } from '../api/motogp';
import { up } from '../lib/i18n';
import { colors, alpha } from '../theme';

// Picks the season (default: the one the service marks as current) and the class (MotoGP, Moto2, Moto3) used by every MotoGP screen.
function useMoto(initialYear) {
  const ss = useAsync(() => seasons(), []);
  const [pick, setPick] = useState(initialYear || null);
  const cur = ss.v?.find((s) => s.current) || ss.v?.[0];
  const season = ss.v?.find((s) => s.year === pick) || cur || null;
  return { ss, season, years: (ss.v || []).map((s) => s.year), setYear: setPick, isCur: !!season && season.id === cur?.id };
}
const Row = ({ r, index, onPress }) => (
  <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
    <View style={[s.pos, r.position === 1 && { backgroundColor: alpha(colors.gold, 0.2), borderColor: colors.gold }]}><Text style={s.posT}>{r.position ?? '–'}</Text></View>
    <View style={{ flex: 1 }}>
      <Text style={s.name} numberOfLines={1}>{r.name || '—'}</Text>
      <Text style={s.sub} numberOfLines={1}>{[r.number != null ? `#${r.number}` : null, r.team, r.bike].filter(Boolean).join(' · ')}</Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>{r.right ? <Text style={s.right}>{r.right}</Text> : null}{r.rightSub ? <Text style={s.sub}>{r.rightSub}</Text> : null}</View>
  </Pressable>
);
const raceRight = (r) => ({ right: r.position === 1 ? r.time || '' : r.gap ? `+${String(r.gap).replace(/^\+/, '')}` : r.status || '', rightSub: r.points != null && r.points !== '' ? `${r.points} pts` : '' });

export function MotoHome({ navigation }) {
  const m = useMoto(); const now = useNow(1000);
  const evs = useAsync(() => (m.season ? events(m.season.id, m.season.year) : Promise.resolve(null)), [m.season?.id]);
  const last = useAsync(() => (m.season ? lastRace(m.season.id, m.season.year) : Promise.resolve(null)), [m.season?.id]);
  const next = evs.v?.find((e) => Date.parse(e.end) >= now) || null; const live = next && now >= Date.parse(next.start);
  return (
    <Screen>
      {(m.ss.loading || evs.loading) && <Skeleton rows={3} />}
      {m.ss.error && <ErrorNote error={m.ss.error} onRetry={m.ss.reload} />}
      {evs.error && <ErrorNote error={evs.error} onRetry={evs.reload} />}
      {next && (
        <Press onPress={() => navigation.navigate('MotoEvent', { event: next, season: m.season })}>
          <Grad color={colors.accent} from={0.55} to={0.05} border={0.45} style={{ padding: 16 }}>
            <Text style={s.eyebrow}>{live ? 'RACE WEEKEND · IN PROGRESS' : 'NEXT GRAND PRIX'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <Text style={{ fontSize: 34 }}>{flagOf(next.iso)}</Text>
              <View style={{ flex: 1 }}><Text style={s.title} numberOfLines={2}>{next.name}</Text><Text style={s.sub}>{`${mgDate(next)} · ${next.circuit}`}</Text></View>
            </View>
            {!live ? <View style={{ marginTop: 12 }}><Countdown ms={Date.parse(next.start) - now} /></View> : null}
          </Grad>
        </Press>)}
      {evs.v && !next && <Card><Note>The season is over: no Grand Prix left.</Note></Card>}
      {last.loading && <Skeleton rows={3} />}
      {last.v && (
        <Card>
          <Eyebrow right="Results">{`Last race · ${last.v.event.short || last.v.event.name}`}</Eyebrow>
          <View style={{ marginTop: 8 }}>{last.v.rows.slice(0, 5).map((r, i) => <Row key={i} r={{ ...r, ...raceRight(r) }} />)}</View>
        </Card>)}
    </Screen>
  );
}

export function MotoCalendar({ navigation }) {
  const m = useMoto(); const now = useNow(60000);
  const evs = useAsync(() => (m.season ? events(m.season.id, m.season.year) : Promise.resolve(null)), [m.season?.id]);
  const upKey = evs.v?.find((e) => Date.parse(e.end) >= now)?.id;
  return (
    <Screen>
      {m.years.length > 0 && <SeasonSwitch year={m.season?.year} years={m.years} max={m.years[0]} onChange={m.setYear} />}
      {(m.ss.loading || evs.loading) && <Skeleton rows={5} />}
      {m.ss.error && <ErrorNote error={m.ss.error} onRetry={m.ss.reload} />}
      {evs.error && <ErrorNote error={evs.error} onRetry={evs.reload} />}
      {evs.v && !evs.v.length && <Note>No races are published for this season yet.</Note>}
      {evs.v?.map((e) => {
        const done = Date.parse(e.end) < now, live = now >= Date.parse(e.start) && !done, isNext = e.id === upKey && !live && !done;
        return (
          <Press key={e.id} onPress={() => navigation.navigate('MotoEvent', { event: e, season: m.season })}>
            <Grad color={live ? '#7A0A12' : colors.accent} from={live ? 0.6 : isNext ? 0.25 : 0.12} to={0.03} border={isNext || live ? 0.5 : 0.25} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={s.round}><Text style={s.roundT}>{`R${e.round}`}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>{`${flagOf(e.iso)} ${e.short || e.name}`}</Text>
                <Text style={s.sub} numberOfLines={1}>{`${mgDate(e)} · ${e.circuit}`}</Text>
              </View>
              {live ? <Pill color={colors.accent} solid>In progress</Pill> : isNext ? <Pill color={colors.accent}>Next</Pill> : done ? <Ionicons name="checkmark-circle" size={20} color={colors.good} /> : null}
            </Grad>
          </Press>);
      })}
    </Screen>
  );
}

export function MotoStandings({ navigation }) {
  const m = useMoto(); const [cat, setCat] = useState(null); const [view, setView] = useState('riders');
  const cats = useAsync(() => (m.season ? categories(m.season.id) : Promise.resolve(null)), [m.season?.id]);
  const catId = cats.v?.find((c) => c.id === cat)?.id || cats.v?.[0]?.id; const isTop = catId && catId === cats.v?.[0]?.id;
  const st = useAsync(() => (m.season && catId ? standings(m.season.id, catId) : Promise.resolve(null)), [m.season?.id, catId]);
  const rows = useMemo(() => (!st.v ? null : view === 'riders' ? st.v : groupStandings(st.v, view === 'teams' ? 'team' : 'bike')), [st.v, view]);
  const top = rows?.[0]?.points || 0;
  return (
    <Screen swipe={{ index: ['riders', 'teams', 'bikes'].indexOf(view), count: 3, onIndex: (i) => setView(['riders', 'teams', 'bikes'][i]) }}>
      {m.years.length > 0 && <SeasonSwitch year={m.season?.year} years={m.years} max={m.years[0]} onChange={(y) => { setCat(null); m.setYear(y); }} />}
      {cats.v?.length > 0 && <Dropdown value={catId} options={cats.v.map((c) => [c.id, c.name])} onChange={setCat} />}
      <Segmented value={view} onChange={setView} items={[['riders', 'Riders'], ['teams', 'Teams'], ['bikes', 'Constructors']]} />
      {(m.ss.loading || cats.loading || st.loading) && <Skeleton rows={6} />}
      {(m.ss.error || cats.error || st.error) && <ErrorNote error={m.ss.error || cats.error || st.error} onRetry={() => { m.ss.reload(); cats.reload(); st.reload(); }} />}
      {rows && !rows.length && <Note>No standings published for this class yet.</Note>}
      {rows?.map((r, i) => (
        <Row key={`${r.riderId || r.name}${i}`} r={view === 'riders' ? { ...r, right: String(r.points), rightSub: i > 0 ? `−${top - r.points}` : 'Leader' } : { position: r.position, name: r.name, team: r.riders.join(' · '), right: String(r.points), rightSub: i > 0 ? `−${top - r.points}` : 'Leader' }}
          onPress={view === 'riders' && r.riderId && isTop ? () => navigation.navigate('MotoRider', { rider: r, season: m.season }) : undefined} />))}
      {view !== 'riders' && rows?.length ? <Note>Added up from the riders' points.</Note> : null}
    </Screen>
  );
}

export function MotoRider({ route }) {
  const { rider, season } = route.params; const now = useNow(60000);
  const res = useAsync(() => riderSeason(season.id, season.year, rider.riderId), [rider.riderId]);
  const list = res.v || []; const races = list.filter((x) => x.race);
  const fin = races.map((x) => x.race.position).filter((p) => Number.isFinite(Number(p)) && p != null).map(Number);
  const stat = [['Position', rider.position ?? '—'], ['Points', rider.points ?? '—'], ['Wins', fin.filter((p) => p === 1).length], ['Podiums', fin.filter((p) => p <= 3).length], ['Best finish', fin.length ? `P${Math.min(...fin)}` : '—'], ['Races', races.length],
    ['Sprint podiums', list.filter((x) => x.sprint && Number(x.sprint.position) <= 3).length], ['Not classified', races.length - fin.length]];
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.5} to={0.05} border={0.4} style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>{`${rider.iso ? flagOf(rider.iso) + ' ' : ''}${season.year}`}</Text>
            <Text style={s.title} numberOfLines={2}>{rider.name}</Text>
            <Text style={s.sub}>{[rider.team, rider.bike].filter(Boolean).join(' · ')}</Text>
          </View>
          {rider.number != null ? <Text style={{ fontFamily: 'display', fontWeight: '800', fontSize: 56, color: 'rgba(255,255,255,0.85)' }}>{rider.number}</Text> : null}
        </View>
      </Grad>
      <Card>
        <Eyebrow>{`${season.year} season`}</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {stat.map(([k, v]) => <View key={k} style={s.stat}><Text style={s.statK}>{up(k)}</Text><Text style={s.statV}>{String(v)}</Text></View>)}
        </View>
        {res.loading && <Note>Loading the season's races. The first time can take several seconds.</Note>}
        {res.error && <Note>{`Results unavailable: ${res.error}`}</Note>}
      </Card>
      {races.length > 0 && (
        <Card>
          <Eyebrow>Race results</Eyebrow>
          <View style={{ marginTop: 8 }}>{[...races].reverse().map((x) => (
            <View key={x.event.id} style={s.row}>
              <View style={s.pos}><Text style={s.posT}>{x.race.position ?? '–'}</Text></View>
              <View style={{ flex: 1 }}><Text style={s.name} numberOfLines={1}>{`${flagOf(x.event.iso)} ${x.event.short || x.event.name}`}</Text><Text style={s.sub}>{x.sprint ? `Sprint: P${x.sprint.position ?? '–'}` : mgDate(x.event)}</Text></View>
              <Text style={s.right}>{x.race.points != null && x.race.points !== '' ? `${x.race.points} pts` : x.race.status || ''}</Text>
            </View>))}</View>
        </Card>)}
    </Screen>
  );
}

export function MotoEvent({ route }) {
  const { event, season } = route.params; const now = useNow(60000);
  const cats = useAsync(() => categories(season.id), [season.id]); const [cat, setCat] = useState(null); const [sel, setSel] = useState(null);
  const catId = cats.v?.find((c) => c.id === cat)?.id || cats.v?.[0]?.id;
  const ss = useAsync(() => (catId ? sessions(event.id, catId) : Promise.resolve(null)), [catId]);
  const withRes = useMemo(() => (ss.v || []).filter((x) => x.status !== 'NOT-STARTED' && !/not.?start|schedul|upcoming/i.test(x.status)), [ss.v]);
  const cur = withRes.find((x) => x.id === sel) || withRes.find((x) => x.type === 'RAC') || withRes.at(-1);
  const cl = useAsync(() => (cur ? classification(cur.id, season.year) : Promise.resolve(null)), [cur?.id]);
  const done = Date.parse(event.end) < now;
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.3} to={0.03} border={0.4} style={{ padding: 14 }}>
        <Text style={s.title} numberOfLines={2}>{`${flagOf(event.iso)} ${event.name}`}</Text>
        <Text style={s.sub}>{`${mgDate(event)} ${season.year}`}</Text>
        <Text style={s.sub}>{[event.circuit, event.place, event.country].filter(Boolean).join(' · ')}</Text>
        <View style={{ marginTop: 8 }}><Pill color={done ? colors.good : colors.accent}>{done ? 'Completed' : Date.parse(event.start) <= now ? 'In progress' : 'Upcoming'}</Pill></View>
      </Grad>
      {ss.v?.length > 0 && (
        <Card>
          <Eyebrow>Weekend schedule</Eyebrow>
          <View style={{ marginTop: 8 }}>{ss.v.filter((x) => x.date && !Number.isNaN(Date.parse(x.date))).map((x) => {
            const a = Date.parse(x.date), over = a < now, live = a <= now && now < a + 45 * 60000;
            return (<View key={x.id} style={s.row}><View style={{ flex: 1 }}><Text style={[s.name, over && !live && { color: colors.muted }]}>{x.name}</Text><Text style={s.sub}>{`${dayName(a, null)} · ${hm(a, null)}`}</Text></View>{live ? <Pill color={colors.accent} solid>Live</Pill> : over ? <Ionicons name="checkmark-circle" size={18} color={colors.good} /> : null}</View>);
          })}</View>
          <Note>Times follow your device's timezone. Shown for the class selected below.</Note>
        </Card>)}
      <Card>
        <Eyebrow>Results</Eyebrow>
        {cats.v?.length > 0 && <View style={{ marginTop: 12 }}><Dropdown value={catId} options={cats.v.map((c) => [c.id, c.name])} onChange={(v) => { setSel(null); setCat(v); }} /></View>}
        {withRes.length > 0 && <View style={{ marginTop: 10 }}><Dropdown value={cur?.id} options={withRes.map((x) => [x.id, x.name])} onChange={setSel} /></View>}
        {(cats.loading || ss.loading || cl.loading) && <Skeleton rows={5} />}
        {(cats.error || ss.error || cl.error) && <Note>{`Results unavailable: ${cats.error || ss.error || cl.error}`}</Note>}
        {ss.v && !withRes.length && <Note>No session results are published yet.</Note>}
        {cl.v && !cl.v.length && <Note>No classification published for this session.</Note>}
        <View style={{ marginTop: 6 }}>{cl.v?.map((r, i) => <Row key={i} r={{ ...r, ...(cur?.type === 'RAC' || cur?.type === 'SPR' ? raceRight(r) : { right: r.lap || r.time, rightSub: r.gap ? `+${String(r.gap).replace(/^\+/, '')}` : '' }) }} />)}</View>
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({
  stat: { width: '31.5%', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10 }, statK: { color: colors.muted, fontFamily: 'label', fontSize: 9, letterSpacing: 1.2 }, statV: { color: colors.fg, fontSize: 22, fontWeight: '800', marginTop: 2 },
  eyebrow: { color: 'rgba(255,255,255,0.8)', fontFamily: 'label', fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  title: { color: colors.fg, fontSize: 24, fontWeight: '800', fontStyle: 'italic' }, sub: { color: colors.muted, fontSize: 14 },
  name: { color: colors.fg, fontSize: 18, fontWeight: '700' }, right: { color: colors.fg, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  pos: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }, posT: { color: colors.fg, fontWeight: '800', fontSize: 16 },
  round: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.accent, 0.25) }, roundT: { color: colors.fg, fontWeight: '800', fontSize: 15 },
});
