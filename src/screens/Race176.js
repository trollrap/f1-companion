import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Note, ErrorNote } from '../components/Screen';
import Skeleton from '../components/Skeleton';
import Dropdown from '../components/Dropdown';
import { StatHeader, StatRow, StatList, SectionLabel } from '../components/StatRows';
import { useAsync } from '../hooks/useAsync';
import { openf1Season, fetchSessions, sessionRaceControl, sessionLapStats, seasonRaceSessions, racePaceOne } from '../api/openf1';
import { colors, alpha } from '../theme';

// ---- shared picker: a finished weekend and one of its sessions (opened from a weekend page it starts on that session) ----
function usePicker() {
  const rp = useRoute().params || {};
  const season = useAsync(() => openf1Season(), []);
  const past = useMemo(() => (season.v || []).filter((m) => Date.parse(m.date_start) < Date.now()), [season.v]);
  const [mk, setMk] = useState(rp.meetingKey || null); const [sk, setSk] = useState(rp.sessionKey || null);
  useEffect(() => { if (past.length) setMk((c) => (c && past.some((m) => m.meeting_key === c) ? c : past[past.length - 1].meeting_key)); }, [past]);
  const ses = useAsync(() => (mk ? fetchSessions(mk) : Promise.resolve([])), [mk]);
  const started = useMemo(() => (ses.v || []).filter((x) => Date.parse(x.date_start) < Date.now()), [ses.v]);
  useEffect(() => { if (started.length) setSk((c) => (c && started.some((x) => x.session_key === c) ? c : (started.find((x) => x.session_name === 'Race') || started[started.length - 1]).session_key)); else if (mk) setSk(null); }, [started, mk]);
  const ui = (
    <Card style={{ gap: 10 }}>
      {past.length ? <Dropdown value={mk} options={past.map((m) => [m.meeting_key, `R${m.round} · ${String(m.meeting_name || '').replace(' Grand Prix', '')}`])} onChange={(v) => { setMk(v); setSk(null); }} prefix="Race" /> : null}
      {started.length ? <Dropdown value={sk} options={started.map((x) => [x.session_key, x.session_name])} onChange={setSk} prefix="Session" /> : null}
    </Card>);
  return { ui, sk, season, ses };
}
const clock = (iso) => { try { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } catch { return ''; } };

// ---- Race control feed ----
const KINDS = { RED: ['#e5484d', 'RED FLAG'], YELLOW: ['#f5c400', 'YELLOW'], 'DOUBLE YELLOW': ['#f5c400', 'DOUBLE YELLOW'], GREEN: ['#3fcf8e', 'GREEN'], CLEAR: ['#3fcf8e', 'CLEAR'], CHEQUERED: ['#cfd3da', 'CHEQUERED'], BLUE: ['#4da3ff', 'BLUE'], 'BLACK AND WHITE': ['#cfd3da', 'WARNING'], BLACK: ['#8a8f99', 'BLACK'] };
function look(m) {
  if (m.category === 'SafetyCar') return /VIRTUAL/i.test(m.text) ? ['#f5a524', 'VIRTUAL SC', 'car-sport'] : ['#f5a524', 'SAFETY CAR', 'car-sport'];
  if (m.category === 'Flag' && KINDS[m.flag]) return [KINDS[m.flag][0], KINDS[m.flag][1], 'flag'];
  if (/PENALTY|DISQUALIFIED|REPRIMAND/i.test(m.text)) return ['#e5484d', 'PENALTY', 'hammer'];
  if (/INVESTIGAT|NOTED|REVIEW/i.test(m.text)) return ['#b08cff', 'STEWARDS', 'search'];
  if (m.category === 'Drs') return ['#4da3ff', 'DRS', 'speedometer'];
  return [colors.muted, (m.category || 'INFO').toUpperCase(), 'information-circle'];
}
export function RaceControlScreen() {
  const P = usePicker(); const [only, setOnly] = useState('key');
  const q = useAsync(() => (P.sk ? sessionRaceControl(P.sk) : Promise.resolve(null)), [P.sk]);
  const all = q.v || [];
  const isKey = (m) => m.category === 'SafetyCar' || (m.category === 'Flag' && m.scope === 'Track' && m.flag !== 'CLEAR' && m.flag !== 'GREEN') || /PENALTY|DISQUALIFIED|INVESTIGAT|RETIRED|STOPPED|CRASH|COLLISION/i.test(m.text) || m.flag === 'CHEQUERED' || m.flag === 'RED';
  const list = only === 'key' ? all.filter(isKey) : all;
  const counts = { sc: all.filter((m) => m.category === 'SafetyCar' && /DEPLOYED/i.test(m.text) && !/VIRTUAL/i.test(m.text)).length, vsc: all.filter((m) => m.category === 'SafetyCar' && /VIRTUAL/i.test(m.text) && /DEPLOYED/i.test(m.text)).length, red: all.filter((m) => m.flag === 'RED').length, pen: all.filter((m) => /PENALTY/i.test(m.text) && !/NO FURTHER|DELETED/i.test(m.text)).length };
  return (
    <Screen header={false}>
      <StatHeader title="Race control" icon="flag" color={colors.gold} note="Every flag, safety car, penalty and steward note of a session in order, as race control sent it." />
      {P.ui}
      {P.season.error ? <ErrorNote error={P.season.error} onRetry={P.season.reload} /> : null}
      {q.loading && P.sk ? <Skeleton rows={6} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {q.v ? (<>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[[counts.sc, 'safety cars', '#f5a524'], [counts.vsc, 'virtual SC', '#f5a524'], [counts.red, 'red flags', '#e5484d'], [counts.pen, 'penalties', '#e5484d']].map(([n, l, c]) => (
            <View key={l} style={{ flex: 1, padding: 10, borderRadius: 14, backgroundColor: alpha(c, 0.14), borderWidth: 1, borderColor: alpha(c, 0.4), alignItems: 'center' }}><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '800' }}>{n}</Text><Text style={{ color: colors.onSoft, fontSize: 11 }}>{l}</Text></View>))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[['key', 'Key moments'], ['all', `Everything (${all.length})`]].map(([k, l]) => (
            <Pressable key={k} onPress={() => setOnly(k)} accessibilityRole="button" style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: only === k ? alpha(colors.accent, 0.25) : colors.surface, borderWidth: 1, borderColor: only === k ? colors.accent : colors.line }}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 13 }}>{l}</Text></Pressable>))}
        </View>
        {list.length ? (
          <View style={{ gap: 8 }}>
            {list.map((m, i) => { const [c, tag, ic] = look(m); return (
              <View key={`${m.time}-${i}`} style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
                <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: alpha(c, 0.22), alignItems: 'center', justifyContent: 'center' }}><Ionicons name={ic} size={18} color={c === colors.muted ? colors.fg : c} /></View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: c === colors.muted ? colors.fg : c, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{tag}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{m.lap ? `Lap ${m.lap} · ` : ''}{clock(m.time)}</Text>
                  </View>
                  <Text style={{ color: colors.fg, fontSize: 14, marginTop: 2, lineHeight: 19 }}>{m.text}</Text>
                </View>
              </View>); })}
          </View>) : <Note>Nothing in this view for this session.</Note>}
      </>) : null}
      {!q.loading && !q.error && !P.sk && P.season.v ? <Note>No session has started yet.</Note> : null}
    </Screen>);
}

// ---- Top speeds and sectors ----
const TABS = [['trap', 'Speed trap'], ['i1', 'Inter 1'], ['i2', 'Inter 2'], ['s1', 'Sector 1'], ['s2', 'Sector 2'], ['s3', 'Sector 3'], ['ideal', 'Ideal lap']];
const secFmt = (t) => (t >= 60 ? `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}` : t.toFixed(3));
export function SpeedsScreen() {
  const P = usePicker(); const [tab, setTab] = useState('trap');
  const q = useAsync(() => (P.sk ? sessionLapStats(P.sk) : Promise.resolve(null)), [P.sk]);
  const speed = tab === 'trap' || tab === 'i1' || tab === 'i2';
  const rows = useMemo(() => {
    const v = (q.v || []).filter((r) => r[tab] != null && r[tab] > 0);
    return v.sort((a, b) => (speed ? b[tab] - a[tab] : a[tab] - b[tab]));
  }, [q.v, tab, speed]);
  const top = rows[0] ? rows[0][tab] : 0, last = rows.length ? rows[rows.length - 1][tab] : 0;
  const frac = (x) => (speed ? Math.max(0.05, (x - last * 0.9) / Math.max(top - last * 0.9, 1)) : Math.max(0.05, 1 - (x - top) / Math.max(last - top, 0.001) * 0.8));
  return (
    <Screen header={false}>
      <StatHeader title="Top speeds and sectors" icon="speedometer" color={colors.accent} note="The fastest speed-trap and intermediate speeds and the best sector times of any session, from every timed lap." />
      {P.ui}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TABS.map(([k, l]) => (<Pressable key={k} onPress={() => setTab(k)} accessibilityRole="button" style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: tab === k ? alpha(colors.accent, 0.25) : colors.surface, borderWidth: 1, borderColor: tab === k ? colors.accent : colors.line }}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 13 }}>{l}</Text></Pressable>))}
      </View>
      {q.loading && P.sk ? <Skeleton rows={8} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {q.v && !rows.length ? <Note>No timing of this kind was recorded for this session.</Note> : null}
      {rows.length ? (
        <StatList>
          {rows.map((r, i) => (<StatRow key={r.number} i={i} badge={i + 1} title={`${r.first ? r.first + ' ' : ''}${r.last || ''}`.trim()} sub={r.team} value={speed ? `${r[tab]} km/h` : tab === 'ideal' ? secFmt(r.ideal) : secFmt(r[tab])} frac={frac(r[tab])} color={r.color || colors.accent} />))}
        </StatList>) : null}
      {tab === 'ideal' ? <Note>Ideal lap = each driver's best three sectors added together, even if they came on different laps.</Note> : null}
    </Screen>);
}

// ---- Season pace chart ----
export function SeasonPaceScreen() {
  const { width } = useWindowDimensions(); const sess = useAsync(() => seasonRaceSessions(), []);
  const [data, setData] = useState({}); const [err, setErr] = useState(''); const [pick, setPick] = useState(null);
  useEffect(() => {
    const list = sess.v || []; let off = false;
    (async () => { for (const r of list) { if (off) return; if (data[r.session_key]) continue; try { const p = await racePaceOne(r.session_key); if (off) return; setData((d) => ({ ...d, [r.session_key]: p })); } catch (e) { if (!off) setErr(String(e && e.message || e)); } } })();
    return () => { off = true; };
  }, [sess.v]); // eslint-disable-line react-hooks/exhaustive-deps
  const rounds = (sess.v || []).filter((r) => data[r.session_key]);
  const names = useMemo(() => { const m = {}; rounds.forEach((r) => Object.entries(data[r.session_key].teams).forEach(([n, o]) => { (m[n] ||= { color: o.color || '#888', sum: 0, n: 0 }); m[n].sum += o.gap; m[n].n++; })); return Object.entries(m).map(([n, o]) => ({ name: n, color: o.color, avg: o.sum / o.n })).sort((a, b) => a.avg - b.avg); }, [rounds.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const N = (sess.v || []).length; const w = width - 32 - 24, h = 300, L = 34, R = 10, T = 12, B = 22; const MAXG = 3;
  const X = (i) => L + ((w - L - R) * i) / Math.max(N - 1, 1); const Y = (g) => T + ((h - T - B) * Math.min(g, MAXG)) / MAXG;
  return (
    <Screen header={false}>
      <StatHeader title="Season pace" icon="trending-up" color={colors.good} note="Each team's race pace in every race of the season: the median of its clean laps compared with the quickest team of that race (0% = fastest). Lower is better." />
      {sess.loading ? <Skeleton rows={6} /> : null}
      {sess.error ? <ErrorNote error={sess.error} onRetry={sess.reload} /> : null}
      {N ? <Note>{rounds.length < N ? `Loading races: ${rounds.length} of ${N}. The first time takes a while; every race is kept on the phone afterwards.` : `${N} races`}</Note> : null}
      {rounds.length > 1 ? (
        <View style={{ padding: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
          <Svg width={w} height={h}>
            {[0, 1, 2, 3].map((g) => (<React.Fragment key={g}><Line x1={L} x2={w - R} y1={Y(g)} y2={Y(g)} stroke={alpha(colors.fg, 0.08)} strokeWidth={1} /><SvgText x={L - 6} y={Y(g) + 4} fontSize={10} fill={colors.muted} textAnchor="end">{`${g}%`}</SvgText></React.Fragment>))}
            {(sess.v || []).map((r, i) => (i % Math.ceil(N / 8) === 0 ? <SvgText key={r.session_key} x={X(i)} y={h - 6} fontSize={10} fill={colors.muted} textAnchor="middle">{`R${r.round}`}</SvgText> : null))}
            {names.map((t) => {
              const pts = (sess.v || []).map((r, i) => { const o = data[r.session_key] && data[r.session_key].teams[t.name]; return o ? [i, o.gap] : null; }).filter(Boolean);
              if (pts.length < 2) return null; const on = pick === t.name, dim = pick && !on;
              return (<React.Fragment key={t.name}><Polyline points={pts.map(([i, g]) => `${X(i)},${Y(g)}`).join(' ')} fill="none" stroke={t.color} strokeWidth={on ? 3.5 : 2} opacity={dim ? 0.15 : 0.95} strokeLinejoin="round" />{on ? pts.map(([i, g]) => <Circle key={i} cx={X(i)} cy={Y(g)} r={3} fill={t.color} />) : null}</React.Fragment>);
            })}
          </Svg>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>Gaps above 3% are drawn at the top edge (wet races and problems can make them huge).</Text>
        </View>) : null}
      {names.length ? (<><SectionLabel color={colors.good}>Season average gap</SectionLabel>
        <StatList>{names.map((t, i) => (<Pressable key={t.name} onPress={() => setPick((c) => (c === t.name ? null : t.name))}><StatRow i={i} badge={i + 1} title={t.name} sub="tap to follow on the chart" value={`+${t.avg.toFixed(2)}%`} frac={Math.max(0.05, 1 - t.avg / 4)} color={t.color} to={false} /></Pressable>))}</StatList></>) : null}
      {err && !rounds.length ? <Note>{`Could not load lap data (${err}). Try again later; OpenF1 sometimes limits requests.`}</Note> : null}
    </Screen>);
}
