import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Pressable, TextInput, Share, Image, LayoutAnimation } from 'react-native';
import { Alert } from '../lib/dialog';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import Grad from '../components/Grad';
import Skeleton from '../components/Skeleton';
import RowReveal from '../components/Reveal';
const Reveal = ({ children }) => children; // Screen already reveals each block, so blocks are not animated twice
import { Countdown, Segmented } from '../components/Shared';
import { Btn } from '../components/FunBits';
import { CountUp, Bar, Pop } from '../components/Anim';
import { useSeason, useNow } from '../hooks/useSeason';
import { useAsync } from '../hooks/useAsync';
import { driverStandings, constructorStandings, sessionResults } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { cachedJSON } from '../lib/cache';
import { usePredictions, score } from '../lib/predictions';
import { useFriends, encode, decode } from '../lib/predFriends';
import { useRoom } from '../lib/room';
import { usePrefs } from '../hooks/usePrefs';
import { circuitHistory, records, onThisDay, nearbyDays, searchDrivers, topDrivers, driverCard, duel, makeQuiz, upTo } from '../lib/trivia';
import { driverPhoto, driverPhotoIds } from '../lib/media';
import { localDriverInfo } from '../api/history';
import { hm, dayName, shortName, flag } from '../lib/time';
import { colors, alpha } from '../theme';

const HOUR = 3600e3, DAY = 86400e3;
const Tile = ({ label, value, sub, color = colors.accent }) => (
  <View style={{ flex: 1, minWidth: 100, padding: 12, borderRadius: 14, backgroundColor: alpha(color, 0.12), borderWidth: 1, borderColor: alpha(color, 0.3) }}>
    <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1.5 }}>{String(label).toUpperCase()}</Text>
    <Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800', marginTop: 2 }}>{value}</Text>
    {sub ? <Text style={{ color: colors.muted, fontSize: 12 }}>{sub}</Text> : null}
  </View>);
const Row = ({ icon, color = colors.accent, children }) => (
  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 6 }}>
    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: alpha(color, 0.18), alignItems: 'center', justifyContent: 'center', marginTop: 1 }}><Ionicons name={icon} size={16} color={color} /></View>
    <Text style={{ flex: 1, color: colors.fg, fontSize: 16, lineHeight: 22 }}>{children}</Text>
  </View>);

// ---------------------------------------------------------------- weather (Open-Meteo, no key)
async function forecastFor(location, country, sessions) {
  const geo = await cachedJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=5&language=en`, 30 * DAY);
  const g = (geo.results || []).find((x) => country && String(x.country || '').toLowerCase().startsWith(String(country).toLowerCase().slice(0, 5))) || (geo.results || [])[0]; if (!g) return {};
  const t0 = Math.min(...sessions.map((s) => Date.parse(s.date_start))), t1 = Math.max(...sessions.map((s) => Date.parse(s.date_end)));
  const day = (ms) => new Date(ms).toISOString().slice(0, 10);
  if (t0 - Date.now() > 15 * DAY) return { far: true };
  const a = day(Math.max(t0, Date.now() - 2 * DAY)), b = day(Math.max(t1, Date.now()));
  const w = await cachedJSON(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&hourly=temperature_2m,precipitation_probability,wind_speed_10m&timezone=UTC&start_date=${a}&end_date=${b}`, HOUR);
  const H = w.hourly; if (!H) return {}; const ix = {}; H.time.forEach((t, i) => { ix[t] = i; });
  const out = {}; sessions.forEach((s) => { const mid = (Date.parse(s.date_start) + Date.parse(s.date_end)) / 2; const k = new Date(Math.round(mid / HOUR) * HOUR).toISOString().slice(0, 13) + ':00'; const i = ix[k]; if (i != null) out[s.session_name] = { t: Math.round(H.temperature_2m[i]), rain: H.precipitation_probability[i], wind: Math.round(H.wind_speed_10m[i]) }; });
  return { by: out };
}

// ---------------------------------------------------------------- the race weekend, in one place
export function WeekendScreen({ navigation }) {
  const season = useSeason(); const now = useNow(1000); const next = season.next; const sessions = season.sessions || [];
  const hist = useMemo(() => { try { return circuitHistory(next); } catch { return null; } }, [next?.meeting_key]);
  const wx = useAsync(() => (next && sessions.length ? forecastFor(next.location || next.circuit_short_name, next.country_name, sessions).catch(() => ({})) : Promise.resolve({})), [next?.meeting_key, sessions.length]);
  const std = useAsync(async () => { const [d, c] = await Promise.all([driverStandings(YEAR).catch(() => []), constructorStandings(YEAR).catch(() => [])]); return { d, c }; }, []);
  if (season.status === 'loading') return <Screen header={false}><Skeleton /></Screen>;
  if (!next) return <Screen header={false}><Card><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '700' }}>Season complete</Text><Note>No race weekend is coming up.</Note></Card></Screen>;
  const live = sessions.find((s) => now >= Date.parse(s.date_start) && now < Date.parse(s.date_end)), upcoming = sessions.find((s) => Date.parse(s.date_start) > now);
  const target = live ? Date.parse(live.date_end) : upcoming ? Date.parse(upcoming.date_start) : Date.parse(next.date_start);
  const label = live ? `${live.session_name} · live, ends in` : upcoming ? `Until ${upcoming.session_name}` : 'Until lights out';
  // What to watch, worked out from the standings and the history of this Grand Prix.
  const watch = []; const D = std.v?.d || [], C = std.v?.c || [];
  const left = Math.max(0, (season.total || 24) - Number(next.round) + 1);
  const afterRaces = (season.races || []).filter((r) => Number(r.round) > Number(next.round)); const maxAfter = afterRaces.length * 25 + afterRaces.filter((r) => r.has_sprint).length * 8;
  const here = (next.has_sprint ? 33 : 25);
  if (D.length > 1) {
    const [a, b] = D; const gap = a.points - b.points;
    if (gap + here > maxAfter && left > 0 && gap <= maxAfter + here) watch.push({ icon: 'trophy', color: colors.gold, t: `${a.name} can win the title this weekend: he needs to outscore ${b.name} by ${Math.max(1, maxAfter - gap + 1)} point${maxAfter - gap + 1 === 1 ? '' : 's'}.` });
    else if (gap > maxAfter + here) watch.push({ icon: 'trophy', color: colors.gold, t: `${a.name} is already champion: the title cannot be taken away mathematically.` });
    else watch.push({ icon: 'trophy', color: colors.gold, t: `${a.name} leads ${b.name} by ${gap} points with ${left} round${left === 1 ? '' : 's'} left (${left * 25 + afterRaces.filter((r) => r.has_sprint).length * 8 + (next.has_sprint ? 8 : 0)} available).` });
    if (D[2] && b.points - D[2].points <= 25) watch.push({ icon: 'flag', color: colors.accent, t: `Only ${b.points - D[2].points} points split ${b.name} and ${D[2].name} in the fight for second.` });
  }
  if (C.length > 1) { const g = C[0].points - C[1].points; watch.push({ icon: 'people', color: colors.purple, t: g <= 40 ? `The constructors' race is tight: ${C[0].name} lead ${C[1].name} by only ${g}.` : `${C[0].name} lead the constructors' table by ${g} points.` }); }
  if (hist) {
    if (hist.drivers[0]) watch.push({ icon: 'ribbon', color: colors.good, t: `${hist.drivers[0].name} has won here ${hist.drivers[0].v} time${hist.drivers[0].v === 1 ? '' : 's'}${hist.winners[0] ? `; last year it was ${hist.winners[0].name} (${hist.winners[0].team})` : ''}.` });
    if (hist.poleConversion != null && hist.poleSample >= 3) watch.push({ icon: 'speedometer', color: colors.accent, t: `Pole position has turned into the win ${hist.poleConversion}% of the time here (last ${hist.poleSample} races).` });
  }
  if (next.has_sprint) watch.push({ icon: 'flash', color: colors.sprint || colors.accent, t: 'Sprint weekend: one practice session, then a sprint, so there is little time to find the set-up.' });
  return (
    <Screen header={false}>
      <Reveal index={0}>
        <Grad color={colors.accent} from={0.4} to={0.04} border={0.45} style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 34 }}>{flag(next.country_code)}</Text>
            <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800' }}>{shortName(next.meeting_name)}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{`Round ${next.round} · ${next.location || ''}`}</Text></View>
          </View>
          <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 2, marginTop: 14 }}>{label.toUpperCase()}</Text>
          <Countdown ms={target - now} />
        </Grad>
      </Reveal>
      <Reveal index={1}>
        <Card>
          <Eyebrow>Weekend timeline</Eyebrow>
          {sessions.length === 0 ? <Note>The session times are not published yet.</Note> : sessions.map((s, i) => {
            const a = Date.parse(s.date_start), e = Date.parse(s.date_end), state = now >= e ? 'done' : now >= a ? 'live' : 'next'; const w = wx.v?.by?.[s.session_name];
            return (
              <View key={s.session_name + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                <View style={{ width: 26, alignItems: 'center' }}>{state === 'done' ? <Ionicons name="checkmark-circle" size={22} color={colors.good} /> : state === 'live' ? <Pop><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent }} /></Pop> : <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.muted }} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: state === 'done' ? colors.muted : colors.fg, fontSize: 18, fontWeight: '700' }}>{s.session_name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{`${dayName(a)} · ${hm(a)}`}{state === 'live' ? '  ·  LIVE' : ''}</Text>
                </View>
                {w ? <View style={{ alignItems: 'flex-end' }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }}>{`${w.t}°`}</Text><Text style={{ color: w.rain >= 40 ? '#6CB6FF' : colors.muted, fontSize: 12 }}>{`${w.rain ?? 0}% rain`}</Text></View> : null}
              </View>); })}
          {wx.v?.far ? <Note>The forecast opens about two weeks before the weekend.</Note> : null}
        </Card>
      </Reveal>
      <Reveal index={2}>
        <Card>
          <Eyebrow>What to watch</Eyebrow>
          {std.loading && !watch.length ? <Skeleton /> : watch.length ? watch.map((w, i) => <Row key={i} icon={w.icon} color={w.color}>{w.t}</Row>) : <Note>Nothing to flag yet.</Note>}
        </Card>
      </Reveal>
      {hist ? (
        <Reveal index={3}>
          <Card>
            <Eyebrow>{`Past winners · ${hist.name}`}</Eyebrow>
            <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 6 }}>{`${hist.editions} editions since ${hist.first}`}</Text>
            {hist.winners.slice(0, 6).map((w, i) => (
              <View key={w.year} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, gap: 10 }}>
                <Text style={{ width: 46, color: colors.accent, fontWeight: '800', fontSize: 16 }}>{w.year}</Text>
                <Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{w.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 14 }} numberOfLines={1}>{w.team}</Text>
              </View>))}
            {hist.drivers.length ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>{hist.drivers.slice(0, 3).map((d) => <Tile key={d.name} label="Wins here" value={d.v} sub={d.name} />)}</View> : null}
          </Card>
        </Reveal>) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Btn icon="trophy-outline" onPress={() => navigation.navigate('Predict')}>Predict</Btn></View>
        <View style={{ flex: 1 }}><Btn icon="information-circle-outline" onPress={() => navigation.navigate('RaceDetail', { meeting: next })}>Race details</Btn></View>
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------- predictions against friends
export function LeaderboardScreen() {
  const season = useSeason(); const P = usePredictions(); const F = useFriends(); const { prefs, setOpt } = usePrefs();
  const [name, setName] = useState(''); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false);
  const myName = (prefs?.opts?.name || '').trim() || 'Me';
  const [roomIn, setRoomIn] = useState('');
  const done = useMemo(() => (season.races || []).filter((r) => Date.parse(r.date_end) < Date.now()).map((r) => Number(r.round)), [season.races]);
  const rounds = useMemo(() => done.filter((r) => P.all[r] || F.list.some((f) => f.picks[r])), [done, P.all, F.list]);
  const res = useAsync(async () => { const out = {}; for (const r of rounds) { const [q, rc] = await Promise.all([sessionResults(YEAR, r, 'qualifying').catch(() => null), sessionResults(YEAR, r, 'results').catch(() => null)]); out[r] = { q, rc }; } return out; }, [rounds.join(',')]);
  const ids = useAsync(() => driverStandings(YEAR).catch(() => []), []);
  const nameOf = (id) => ids.v?.find((d) => d.driverId === id)?.last || String(id).split('_').pop();
  const R = useRoom(myName, encode(myName, P.all));
  const players = [{ name: myName, me: true, picks: P.all }, ...F.list.filter((x) => !R.members.some((m) => m.name.toLowerCase() === x.name.toLowerCase())), ...R.members.filter((m) => m.name.toLowerCase() !== myName.toLowerCase())];
  const table = players.map((p) => {
    let total = 0, exact = 0, rd = 0, best = 0; const per = [];
    rounds.forEach((r) => { const pk = p.picks[r]; if (!pk || !res.v?.[r]) return; const s = score(pk, res.v[r].q, res.v[r].rc); if (!s.done) return; total += s.total; rd++; best = Math.max(best, s.total); exact += s.podium.filter((x) => x === 3).length + (s.pole === 2 ? 1 : 0); per.push(s.total); });
    return { ...p, total, rd, best, exact, avg: rd ? total / rd : 0 };
  }).sort((a, b) => b.total - a.total || b.avg - a.avg);
  const maxT = Math.max(1, ...table.map((t) => t.total));
  const mine = encode(myName, P.all);
  const add = () => { const d = decode(code); if (!d) { Alert.alert('That code does not look right', 'Paste the whole code your friend shared from their Predictions screen.'); return; } F.add({ name: name.trim() || d.name, picks: d.picks }); setCode(''); setName(''); };
  return (
    <Screen header={false}>
      <Reveal index={0}>
        <Card>
          <Eyebrow>Season leaderboard</Eyebrow>
          {res.loading && rounds.length ? <Skeleton /> : null}
          {!rounds.length ? <Note>No finished race has predictions yet. Make your picks on the Predictions screen before a race, and add friends below to compare.</Note> : null}
          {rounds.length ? table.map((t, i) => (
            <Pop key={t.name} delay={i * 70} trigger={res.v ? 1 : 0}>
              <View style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ width: 28, color: i === 0 ? colors.gold : colors.muted, fontWeight: '800', fontSize: 20 }}>{i + 1}</Text>
                  <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{t.name}{t.me ? '  (you)' : ''}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`${t.rd} race${t.rd === 1 ? '' : 's'} · avg ${t.avg.toFixed(1)} · best ${t.best} · ${t.exact} exact`}</Text></View>
                  <CountUp value={t.total} style={{ color: colors.fg, fontSize: 26, fontWeight: '800' }} />
                </View>
                <View style={{ marginTop: 8 }}><Bar pct={(t.total / maxT) * 100} color={i === 0 ? colors.gold : colors.accent} delay={i * 80} /></View>
                {!t.me ? <Pressable onPress={() => Alert.alert('Remove?', `Remove ${t.name} from your friends?`, [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: () => F.remove(t.name) }])} hitSlop={8}><Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>Remove</Text></Pressable> : null}
              </View>
            </Pop>)) : null}
          {rounds.length ? <Note>Scoring: pole 2, each podium pick 3 when exact or 1 when the driver finishes on the podium elsewhere. Best round: 11.</Note> : null}
        </Card>
      </Reveal>
      <Reveal index={1}>
        <Card>
          <Eyebrow>Live room</Eyebrow>
          {R.id ? (<View style={{ gap: 10 }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>{`You are in a room with ${R.members.length} ${R.members.length === 1 ? 'player' : 'players'}. Your picks sync by themselves every minute. ${R.status}`}</Text>
            <Text selectable style={{ color: colors.fg, fontSize: 15, fontWeight: '700' }}>{`Code: ${R.id}`}</Text>
            <View style={{ gap: 8 }}>
              <Btn icon="share-outline" onPress={() => Share.share({ message: `Join my F1 predictions room in the app: ${R.id}` }).catch(() => {})}>Share room code</Btn>
              <Btn icon="refresh" disabled={R.busy} onPress={R.refresh}>Refresh now</Btn>
              <Btn icon="exit-outline" onPress={() => Alert.alert('Leave room?', 'You stay on friends lists you added by code.', [{ text: 'Cancel' }, { text: 'Leave', style: 'destructive', onPress: R.leave }])}>Leave room</Btn>
            </View>
          </View>) : (<View style={{ gap: 10 }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>No account needed. Make a room, send the code to friends, and everyone appears on the leaderboard and updates live. Anyone with the code can see the picks in the room, so only share it with friends.</Text>
            <Btn tone="solid" icon="people" disabled={R.busy} onPress={() => R.create().catch((e) => Alert.alert('Could not make a room', String(e?.message || 'No connection.')))}>Create a room</Btn>
            <TextInput value={roomIn} onChangeText={setRoomIn} placeholder="Or paste a room code" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} style={{ color: colors.fg, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10 }} />
            <Btn icon="enter-outline" disabled={!roomIn.trim()} onPress={() => R.join(roomIn).then(() => setRoomIn('')).catch((e) => Alert.alert('Could not join', String(e?.message || 'No connection.')))}>Join room</Btn>
          </View>)}
        </Card>
      </Reveal>
      <Reveal index={2}>
        <Card>
          <Eyebrow>Your code</Eyebrow>
          <TextInput value={prefs?.opts?.name || ''} onChangeText={(v) => setOpt('name', v)} placeholder="Your name on the leaderboard" placeholderTextColor={colors.muted} maxLength={24} style={{ color: colors.fg, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, height: 46, fontSize: 16, marginVertical: 10 }} />
          <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 10 }}>Send this to a friend. They paste it below and you appear on their leaderboard. Send a new code any time to update your picks.</Text>
          <Btn icon="share-outline" onPress={() => Share.share({ message: mine }).catch(() => {})}>Share my picks</Btn>
        </Card>
      </Reveal>
      <Reveal index={3}>
        <Card>
          <Eyebrow>Add a friend</Eyebrow>
          <TextInput value={name} onChangeText={setName} placeholder="Name (optional)" placeholderTextColor={colors.muted} style={{ color: colors.fg, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, height: 46, fontSize: 16, marginTop: 8 }} />
          <TextInput value={code} onChangeText={setCode} placeholder="Paste their code (starts with F1P|)" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} style={{ color: colors.fg, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, height: 46, fontSize: 16, marginVertical: 10 }} />
          <Btn tone="solid" icon="person-add" disabled={!code.trim()} onPress={add}>Add to leaderboard</Btn>
        </Card>
      </Reveal>
    </Screen>
  );
}

// ---------------------------------------------------------------- quiz
const cur = () => { try { return driverPhotoIds(); } catch { return []; } };
export function QuizScreen() {
  const [mode, setMode] = useState('menu'); const [qs, setQs] = useState([]); const [i, setI] = useState(0); const [pick, setPick] = useState(null); const [pts, setPts] = useState(0); const [streak, setStreak] = useState(0); const [best, setBest] = useState(0); const [hi, setHi] = useState(0);
  const lastRef = useRef(0);
  useEffect(() => { try { const AS = require('@react-native-async-storage/async-storage').default; AS.getItem('quizBest').then((v) => { if (v) setHi(Number(v) || 0); }).catch(() => {}); } catch {} }, []);
  const start = (m) => {
    let list = [];
    if (m === 'faces') { const ids = cur().filter((id) => driverPhoto(id)); const nm = (id) => localDriverInfo(id)?.name || id.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '); const pool = ids.sort(() => Math.random() - 0.5);
      list = pool.slice(0, 10).map((id) => { const wrong = pool.filter((x) => x !== id).sort(() => Math.random() - 0.5).slice(0, 3).map(nm); return { q: 'Who is this driver?', photo: driverPhoto(id), opts: [nm(id), ...wrong].sort(() => Math.random() - 0.5), a: nm(id), why: '' }; }); }
    else list = makeQuiz(10);
    setQs(list); setI(0); setPick(null); setPts(0); setStreak(0); setBest(0); lastRef.current = Date.now(); setMode(m);
  };
  const q = qs[i]; const finished = mode !== 'menu' && i >= qs.length;
  const answer = (o) => { if (pick != null || !q) return; setPick(o); LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity')); if (o === q.a) { const quick = Date.now() - lastRef.current < 6000; setPts((p) => p + 10 + (quick ? 5 : 0) + Math.min(streak, 5)); setStreak((s) => { const n = s + 1; setBest((b) => Math.max(b, n)); return n; }); } else setStreak(0); };
  const nextQ = () => { setPick(null); setI((x) => x + 1); lastRef.current = Date.now(); };
  useEffect(() => { if (finished && pts > hi) { setHi(pts); try { require('@react-native-async-storage/async-storage').default.setItem('quizBest', String(pts)); } catch {} } }, [finished]);
  const faces = cur().filter((id) => driverPhoto(id)).length >= 6;
  if (mode === 'menu') return (
    <Screen header={false}>
      <Reveal index={0}><Grad color={colors.accent} from={0.4} to={0.05} border={0.4} style={{ padding: 18 }}><Text style={{ color: colors.fg, fontSize: 28, fontWeight: '800' }}>F1 Quiz</Text><Text style={{ color: colors.muted, fontSize: 16, marginTop: 4 }}>{`Ten questions from every season up to ${upTo()}. Quick answers and streaks earn bonus points.`}</Text><Text style={{ color: colors.gold, fontSize: 15, marginTop: 10, fontWeight: '700' }}>{`Best score: ${hi}`}</Text></Grad></Reveal>
      <Reveal index={1}><Card onPress={() => start('trivia')}><Eyebrow>Classic</Eyebrow><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700', marginTop: 4 }}>History trivia</Text><Note>Race winners, champions, poles, teams and duels.</Note></Card></Reveal>
      {faces ? <Reveal index={2}><Card onPress={() => start('faces')}><Eyebrow>Photos</Eyebrow><Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700', marginTop: 4 }}>Guess the driver</Text><Note>Name the driver from their photo.</Note></Card></Reveal> : null}
    </Screen>);
  if (finished) return (
    <Screen header={false}>
      <Pop><Grad color={colors.gold} from={0.35} to={0.04} border={0.5} style={{ padding: 22, alignItems: 'center' }}>
        <Text style={{ color: colors.muted, letterSpacing: 3, fontSize: 12 }}>FINAL SCORE</Text>
        <CountUp value={pts} style={{ color: colors.fg, fontSize: 64, fontWeight: '800' }} />
        <Text style={{ color: colors.fg, fontSize: 17 }}>{`${qs.filter((_, k) => k < qs.length).length} questions · best streak ${best}`}</Text>
        {pts >= hi && pts > 0 ? <Text style={{ color: colors.gold, fontSize: 16, fontWeight: '800', marginTop: 8 }}>New best score!</Text> : <Text style={{ color: colors.muted, marginTop: 8 }}>{`Best: ${hi}`}</Text>}
      </Grad></Pop>
      <Btn tone="solid" icon="refresh" onPress={() => start(mode)}>Play again</Btn><Btn onPress={() => setMode('menu')}>Menu</Btn>
    </Screen>);
  return (
    <Screen header={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.muted, fontSize: 14, letterSpacing: 2 }}>{`QUESTION ${i + 1} / ${qs.length}`}</Text>
        <Text style={{ color: colors.gold, fontSize: 16, fontWeight: '800' }}>{`${pts} pts${streak > 1 ? `  ·  🔥 ${streak}` : ''}`}</Text>
      </View>
      <Bar pct={(i / qs.length) * 100} height={6} />
      <Pop trigger={i}>
        <Card>
          {q.photo ? <Image source={q.photo} resizeMode="contain" style={{ width: '100%', height: 220, marginBottom: 10 }} /> : null}
          <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '700', lineHeight: 28 }}>{q.q}</Text>
        </Card>
      </Pop>
      {q.opts.map((o, k) => { const right = o === q.a, chosen = pick === o; const show = pick != null; const c = show ? (right ? colors.good : chosen ? colors.red : colors.line) : colors.line;
        return (
          <Pressable key={o + k} onPress={() => answer(o)} style={({ pressed }) => [{ padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: c, backgroundColor: show && (right || chosen) ? alpha(c, 0.18) : colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10 }, pressed && { opacity: 0.8 }]}>
            <Text style={{ flex: 1, color: colors.fg, fontSize: 18, fontWeight: '600' }}>{o}</Text>
            {show && right ? <Ionicons name="checkmark-circle" size={22} color={colors.good} /> : show && chosen ? <Ionicons name="close-circle" size={22} color={colors.red} /> : null}
          </Pressable>); })}
      {pick != null ? (<Pop><Text style={{ color: pick === q.a ? colors.good : '#ff8a8a', fontSize: 16, fontWeight: '700' }}>{pick === q.a ? 'Correct!' : `It was ${q.a}.`}{q.why ? `  ${q.why}` : ''}</Text><View style={{ height: 8 }} /><Btn tone="solid" icon="arrow-forward" onPress={nextQ}>{i + 1 >= qs.length ? 'See score' : 'Next'}</Btn></Pop>) : null}
    </Screen>);
}

// ---------------------------------------------------------------- records, on this day, all-time duel
export function RecordsScreen() {
  const [tab, setTab] = useState('day');
  return (
    <Screen header={false}>
      <Segmented value={tab} onChange={setTab} items={[['day', 'On this day'], ['rec', 'Records'], ['duel', 'Duel']]} />
      {tab === 'day' ? <OnThisDay /> : tab === 'rec' ? <RecordLists /> : <AllTimeDuel />}
    </Screen>);
}
function OnThisDay() {
  const d = new Date(); const today = onThisDay(d.getMonth() + 1, d.getDate()); const near = today.length ? [] : nearbyDays(d, 6).filter((x) => x.offset !== 0);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const List = ({ rows }) => rows.map((r, i) => (
    <RowReveal key={r.year + r.race} index={i}>
      <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
        <Text style={{ width: 54, color: colors.accent, fontSize: 20, fontWeight: '800' }}>{r.year}</Text>
        <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '700' }}>{r.race}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{`Won by ${r.winner}${r.team ? ` (${r.team})` : ''}${r.pole && r.pole !== r.winner ? ` · pole ${r.pole}` : r.pole ? ' · from pole' : ''}`}</Text></View>
      </View></RowReveal>));
  return (
    <View style={{ gap: 12 }}>
      <Card><Eyebrow>{`Today · ${d.getDate()} ${MON[d.getMonth()]}`}</Eyebrow>{today.length ? <List rows={today} /> : <Note>No Grand Prix was ever held on this date. Here are the nearest days that had one:</Note>}</Card>
      {near.map((n) => (<Card key={n.offset}><Eyebrow>{`${n.day} ${MON[n.month - 1]} · ${n.offset > 0 ? `in ${n.offset} day${n.offset > 1 ? 's' : ''}` : `${-n.offset} day${n.offset < -1 ? 's' : ''} ago`}`}</Eyebrow><List rows={n.races.slice(0, 4)} /></Card>))}
    </View>);
}
function RecordLists() {
  const R = useMemo(() => records(), []); const [open, setOpen] = useState('wins');
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{R.totals.map(([l, v]) => <Tile key={l} label={l} value={v} />)}</View>
      {R.facts.map((f) => (<Card key={f.label}><Eyebrow>{f.label}</Eyebrow><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800', marginTop: 4 }}>{f.value}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{f.sub}</Text></Card>))}
      {R.lists.map((l) => { const isOpen = open === l.key; const max = l.rows[0]?.v || 1;
        return (
          <Card key={l.key} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity')); setOpen(isOpen ? null : l.key); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: colors.fg, fontSize: 19, fontWeight: '700' }}>{l.title}</Text><Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} /></View>
            {!isOpen && l.rows[0] ? <Text style={{ color: colors.muted, fontSize: 14, marginTop: 2 }}>{`${l.rows[0].name} · ${l.rows[0].v}`}</Text> : null}
            {isOpen ? l.rows.map((r, i) => (
              <View key={r.name + i} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}><Text style={{ width: 22, color: i === 0 ? colors.gold : colors.muted, fontWeight: '800' }}>{i + 1}</Text><Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{r.name}{r.sub ? `  (${r.sub})` : ''}</Text><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800' }}>{r.v}</Text></View>
                <View style={{ marginTop: 4, marginLeft: 30 }}><Bar pct={(r.v / max) * 100} height={5} delay={i * 40} color={i === 0 ? colors.gold : colors.accent} /></View>
              </View>)) : null}
          </Card>); })}
    </View>);
}
function Picker({ value, onPick, label }) {
  const [q, setQ] = useState(''); const hits = useMemo(() => searchDrivers(q), [q]); const sug = useMemo(() => topDrivers(5), []);
  if (value) return (<Pressable onPress={() => onPick(null)} style={{ flex: 1, padding: 12, borderRadius: 14, backgroundColor: alpha(colors.accent, 0.14), borderWidth: 1, borderColor: alpha(colors.accent, 0.4) }}><Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 2 }}>{label}</Text><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{value.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Tap to change</Text></Pressable>);
  return (
    <View style={{ flex: 1 }}>
      <TextInput value={q} onChangeText={setQ} placeholder={`${label}: search a driver`} placeholderTextColor={colors.muted} autoCorrect={false} style={{ color: colors.fg, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, height: 46, fontSize: 16 }} />
      {(q.length >= 2 ? hits : sug).map((h) => (<Pressable key={h.i} onPress={() => onPick(h)} style={({ pressed }) => [{ paddingVertical: 8 }, pressed && { opacity: 0.6 }]}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '600' }}>{h.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{`${h.nat || ''} ${h.years}`}</Text></Pressable>))}
    </View>);
}
function AllTimeDuel() {
  const [a, setA] = useState(null); const [b, setB] = useState(null);
  const A = useMemo(() => (a ? driverCard(a.i) : null), [a]); const B = useMemo(() => (b ? driverCard(b.i) : null), [b]); const D = useMemo(() => (a && b ? duel(a.i, b.i) : null), [a, b]);
  return (
    <View style={{ gap: 12 }}>
      <Card><Eyebrow>All-time duel</Eyebrow><Text style={{ color: colors.muted, fontSize: 14, marginBottom: 10 }}>Any two drivers in Formula 1 history, side by side.</Text>
        <View style={{ gap: 10 }}><Picker value={a} onPick={setA} label="DRIVER 1" /><Picker value={b} onPick={setB} label="DRIVER 2" /></View></Card>
      {A && B ? (
        <Reveal index={0}><Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}><Text style={{ flex: 1, color: colors.fg, fontSize: 17, fontWeight: '800' }} numberOfLines={1}>{A.name}</Text><Text style={{ flex: 1, textAlign: 'right', color: colors.fg, fontSize: 17, fontWeight: '800' }} numberOfLines={1}>{B.name}</Text></View>
          {A.stats.map(([l, av], i) => { const bv = B.stats[i][1]; const tot = (Number(av) + Number(bv)) || 1;
            return (
              <View key={l} style={{ paddingVertical: 7 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CountUp value={Number(av)} decimals={l === 'Points' ? 1 : 0} style={{ width: 80, color: av > bv ? colors.gold : colors.fg, fontSize: 20, fontWeight: '800' }} />
                  <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12, letterSpacing: 1.5 }}>{l.toUpperCase()}</Text>
                  <View style={{ width: 80, alignItems: 'flex-end' }}><CountUp value={Number(bv)} decimals={l === 'Points' ? 1 : 0} style={{ color: bv > av ? colors.gold : colors.fg, fontSize: 20, fontWeight: '800' }} /></View>
                </View>
                <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}><View style={{ flex: Math.max(0.02, Number(av) / tot) }}><Bar pct={100} color={av >= bv ? colors.accent : alpha(colors.accent, 0.35)} height={5} /></View><View style={{ flex: Math.max(0.02, Number(bv) / tot) }}><Bar pct={100} color={bv >= av ? colors.purple : alpha(colors.purple, 0.35)} height={5} /></View></View>
              </View>); })}
          {D ? (<View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
            {D.shared ? (<><Text style={{ color: colors.muted, fontSize: 12, letterSpacing: 1.5 }}>{`HEAD TO HEAD · ${D.shared} RACES TOGETHER`}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}><Text style={{ color: colors.fg, fontSize: 28, fontWeight: '800', width: 70 }}>{D.ahead[0]}</Text><View style={{ flex: 1 }}><Bar pct={(D.ahead[0] / Math.max(1, D.ahead[0] + D.ahead[1])) * 100} height={8} /></View><Text style={{ color: colors.fg, fontSize: 28, fontWeight: '800', width: 70, textAlign: 'right' }}>{D.ahead[1]}</Text></View>
              <Text style={{ color: colors.muted, fontSize: 13 }}>Times each finished ahead of the other (a retirement counts as behind).</Text>
              {D.sameTeam ? <Text style={{ color: colors.fg, fontSize: 15, marginTop: 6 }}>{`As team-mates (${D.sameTeam} races): ${D.sameTeamAhead[0]}–${D.sameTeamAhead[1]}`}</Text> : null}</>)
              : <Text style={{ color: colors.muted, fontSize: 15 }}>They never raced in the same Grand Prix.</Text>}
          </View>) : null}
        </Card></Reveal>) : null}
    </View>);
}
