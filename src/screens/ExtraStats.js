import React, { useMemo, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import Skeleton from '../components/Skeleton';
import Dropdown from '../components/Dropdown';
import ShareCard from '../components/ShareCard';
import { useAsync } from '../hooks/useAsync';
import { jolpicaSchedule, seasonPoints } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { historyYears, localAllDrivers, localTeammates } from '../api/history';
import { travel } from '../lib/travel';
import { swing } from '../lib/titleSwing';
import { norm } from '../lib/names';
import { colors, alpha, teamColor } from '../theme';

const yearsList = () => { let a = []; try { a = historyYears(); } catch {} return [...new Set([YEAR, ...a])].sort((x, y) => y - x); };
const Line = ({ children, first }) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: first ? 0 : 1, borderTopColor: colors.line }}>{children}</View>;

// ---------- Season travel distance ----------
export function TravelScreen() {
  const years = useMemo(yearsList, []); const [year, setYear] = useState(YEAR);
  const q = useAsync(() => jolpicaSchedule(year), [year]); const T = useMemo(() => (q.v ? travel(q.v) : null), [q.v]);
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  return (
    <Screen header={false}>
      <Card><Eyebrow>Season travel</Eyebrow><View style={{ marginTop: 10 }}><Dropdown value={year} options={years.map((y) => [y, String(y)])} onChange={(v) => setYear(Number(v))} prefix="Season" /></View>
        <Note>Straight-line (great-circle) distance from each round to the next, using the circuit coordinates. Real routes are longer, and the teams sometimes fly home between races, so this is a lower bound.</Note></Card>
      {q.loading ? <Skeleton rows={5} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {T ? (<>
        <ShareCard title={`${year} F1 season: ${fmt(T.total)} km between ${T.rounds} rounds`}>
          <Card><Eyebrow>{`${year} in numbers`}</Eyebrow>
            <Text style={{ color: colors.fg, fontSize: 38, fontWeight: '900', marginTop: 6 }}>{`${fmt(T.total)} km`}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{`${T.rounds} rounds in ${T.countries} countries, about ${T.laps.toFixed(1)} times around the Earth`}</Text>
            <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>{[['LONGEST LEG', `${fmt(T.longest.km)} km`, `${T.longest.from.place} to ${T.longest.to.place}`], ['SHORTEST LEG', `${fmt(T.shortest.km)} km`, `${T.shortest.from.place} to ${T.shortest.to.place}`], ['AVERAGE LEG', `${fmt(T.avg)} km`, '']].map(([k, v, s]) => (<View key={k} style={{ flex: 1 }}><Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800' }}>{k}</Text><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '900' }}>{v}</Text>{s ? <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={2}>{s}</Text> : null}</View>))}</View></Card>
        </ShareCard>
        <Card><Eyebrow>Round by round</Eyebrow>
          {T.legs.map((l, i) => (<Line key={l.to.round} first={i === 0}><Text style={{ width: 28, color: colors.muted, fontWeight: '800' }}>{`R${l.to.round}`}</Text><Text style={{ flex: 1, color: colors.fg, fontSize: 14 }} numberOfLines={2}>{`${l.from.place} to ${l.to.place}`}</Text><Text style={{ color: colors.fg, fontWeight: '800' }}>{`${fmt(l.km)} km`}</Text></Line>))}</Card>
      </>) : null}
      {q.v && !T ? <Note>Not enough rounds with coordinates for this season yet.</Note> : null}
    </Screen>);
}

// ---------- Championship: what changed after a race ----------
export function TitleSwingScreen() {
  const years = useMemo(yearsList, []); const [year, setYear] = useState(YEAR); const [rd, setRd] = useState(null);
  const q = useAsync(() => seasonPoints(year), [year]); const sp = q.v;
  const idx = sp && sp.rounds.length ? (rd != null && rd < sp.rounds.length ? rd : sp.rounds.length - 1) : -1; const S = useMemo(() => (sp ? swing(sp, idx) : null), [sp, idx]);
  const arrow = (r) => (r.posBefore == null ? '' : r.posAfter < r.posBefore ? `▲${r.posBefore - r.posAfter}` : r.posAfter > r.posBefore ? `▼${r.posAfter - r.posBefore}` : '–');
  return (
    <Screen header={false}>
      <Card><Eyebrow>Title picture</Eyebrow>
        <View style={{ marginTop: 10, gap: 8 }}><Dropdown value={year} options={years.map((y) => [y, String(y)])} onChange={(v) => { setYear(Number(v)); setRd(null); }} prefix="Season" />
          {sp && sp.rounds.length ? <Dropdown value={idx} options={sp.rounds.map((r, i) => [i, `R${r.round} ${r.name}`.trim()])} onChange={(v) => setRd(Number(v))} prefix="After" /> : null}</View>
        <Note>Driver standings before and after the chosen race, and how the gap to the leader moved. Seasons before the live one use offline race points (sprint points are only included in the live season).</Note></Card>
      {q.loading ? <Skeleton rows={6} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {S ? (
        <ShareCard title={`After ${S.name}: ${S.rows[0].name} leads on ${S.rows[0].after}`}>
          <Card><Eyebrow>{`After R${S.round} ${S.name}`}</Eyebrow>
            {S.leaderChanged ? <Text style={{ color: colors.gold, fontWeight: '800', marginTop: 6 }}>{`New championship leader: ${S.rows[0].name}`}</Text> : null}
            {S.rows.slice(0, 12).map((r, i) => (
              <Line key={r.id} first={i === 0}>
                <Text style={{ width: 24, color: colors.muted, fontWeight: '800' }}>{r.posAfter}</Text>
                <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: teamColor(r.teamId) }} />
                <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{r.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{i === 0 ? `Leader · ${r.after} pts` : `${r.after} pts · gap ${r.gapAfter}${r.posBefore != null ? ` (was ${r.gapBefore})` : ''}`}</Text></View>
                <Text style={{ color: r.gain > 0 ? colors.good : colors.muted, fontWeight: '800', fontSize: 13 }}>{r.gain > 0 ? `+${r.gain}` : '0'}</Text>
                <Text style={{ width: 34, textAlign: 'right', color: arrow(r).startsWith('▲') ? colors.good : arrow(r).startsWith('▼') ? colors.red : colors.muted, fontWeight: '800', fontSize: 13 }}>{arrow(r)}</Text>
              </Line>))}
          </Card></ShareCard>) : null}
      {S && S.rows.some((r, i) => i > 0 && r.after === S.rows[i - 1].after) ? <Note>Drivers level on points are listed alphabetically here. The official order breaks ties on race results.</Note> : null}
    </Screen>);
}

// ---------- Team-mate career head-to-head ----------
export function TeamMateScreen() {
  const [text, setText] = useState(''); const [pick, setPick] = useState(null); const [open, setOpen] = useState(null);
  const all = useMemo(() => { try { return localAllDrivers(); } catch { return []; } }, []);
  const found = useMemo(() => { const t = norm(text); if (t.length < 2) return []; return all.filter((d) => norm(d.name).includes(t)).sort((a, b) => (b.last_year || 0) - (a.last_year || 0)).slice(0, 8); }, [text, all]);
  const pairs = useMemo(() => {
    if (!pick) return []; let rows = []; try { rows = localTeammates(pick.driverId) || []; } catch {}
    const m = {}; rows.forEach((o) => { const p = (m[o.mateId] ||= { mateId: o.mateId, name: o.mateName, years: [], races: 0, qa: 0, qb: 0, ra: 0, rb: 0, pa: 0, pb: 0 }); p.years.push(o); p.races += o.races; p.qa += o.qa; p.qb += o.qb; p.ra += o.ra; p.rb += o.rb; p.pa += o.pa; p.pb += o.pb; });
    return Object.values(m).sort((a, b) => b.races - a.races);
  }, [pick]);
  const Bar = ({ a, b, label }) => { const t = a + b; return (<View style={{ marginTop: 6 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontWeight: '800' }}>{a}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text><Text style={{ color: colors.fg, fontWeight: '800' }}>{b}</Text></View><View style={{ flexDirection: 'row', height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: alpha(colors.fg, 0.1), marginTop: 3 }}>{t ? <><View style={{ flex: a, backgroundColor: colors.accent }} /><View style={{ flex: b, backgroundColor: colors.muted }} /></> : null}</View></View>); };
  return (
    <Screen header={false}>
      <Card><Eyebrow>Team-mate battles</Eyebrow>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}><Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={text} onChangeText={(t) => { setText(t); setPick(null); setOpen(null); }} placeholder="Type a driver's name" placeholderTextColor={colors.muted} accessibilityLabel="Search a driver" style={{ flex: 1, color: colors.fg, fontSize: 17, paddingVertical: 8 }} /></View>
        {!pick ? found.map((d) => (<Pressable key={d.driverId} accessibilityRole="button" onPress={() => { setPick(d); setText(d.name); }} style={({ pressed }) => [{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 16 }}>{d.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{`${d.first_year || ''} to ${d.last_year || ''}`}</Text></Pressable>)) : null}
        <Note>Over every season two drivers shared a team. Qualifying is the grid slot, races are finishing order (a retirement counts as behind). Only pairs with 3 or more races together are listed. Offline.</Note></Card>
      {pick && !pairs.length ? <Note>No team-mate with 3 or more races together in the history.</Note> : null}
      {pairs.map((p) => { const on = open === p.mateId; return (
        <Card key={p.mateId}>
          <Pressable accessibilityRole="button" onPress={() => setOpen(on ? null : p.mateId)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontWeight: '900', fontSize: 16, flex: 1 }} numberOfLines={1}>{`${pick.name} vs ${p.name}`}</Text><Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} /></View>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{`${p.races} races together, ${p.years.map((y) => y.year).sort().join(', ')}`}</Text>
            <Bar a={p.qa} b={p.qb} label="Qualified ahead (grid)" /><Bar a={p.ra} b={p.rb} label="Finished ahead" /><Bar a={Math.round(p.pa)} b={Math.round(p.pb)} label="Points" />
          </Pressable>
          {on ? p.years.sort((a, b) => a.year - b.year).map((y) => (<Line key={y.year}><Text style={{ width: 44, color: colors.muted, fontWeight: '800' }}>{y.year}</Text><Text style={{ flex: 1, color: colors.fg, fontSize: 13 }}>{`${y.team} · ${y.races} races`}</Text><Text style={{ color: colors.fg, fontSize: 13, fontWeight: '800' }}>{`Q ${y.qa}-${y.qb} · R ${y.ra}-${y.rb}`}</Text></Line>)) : null}
        </Card>); })}
    </Screen>);
}
