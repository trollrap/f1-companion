import React, { useCallback, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Note } from '../components/Screen';
import Grad from '../components/Grad';
import Press from '../components/Press';
import { StatHeader, StatRow, StatList, SectionLabel } from '../components/StatRows';
import { ResultRow } from '../components/Shared';
import { usePrefs } from '../hooks/usePrefs';
import { kvGet, weekId, weekPoints, today, seedOf } from '../lib/kv';
import { roomId, syncWeek } from '../lib/weekBoard';
import { raceRowsOf } from '../api/history';
import { colors, alpha } from '../theme';

// ---- Friend scoreboard: weekly points from the games you play, against everyone in your prediction room ----
export function FriendBoardScreen({ navigation }) {
  const { prefs } = usePrefs(); const name = (prefs?.opts?.name || '').trim();
  const [st, setSt] = useState({ loading: true }); const [n, setN] = useState(0);
  useFocusEffect(useCallback(() => { let off = false; (async () => {
    const wk = weekId(); const led = await kvGet(`wk:${wk}`, {}); const pts = weekPoints(led); const days = Object.keys(led).length;
    const id = await roomId(); let board = null, error = '';
    if (id) { try { board = await syncWeek(id, name, pts, days); } catch (e) { error = String((e && e.message) || e).slice(0, 80); } }
    if (!off) setSt({ loading: false, wk, pts, days, id, board, error });
  })(); return () => { off = true; }; }, [name, n]));
  const rows = useMemo(() => {
    const p = { ...((st.board && st.board.players) || {}) }; if (name && st.pts != null) p[name] = { p: st.pts, d: st.days, t: Date.now() };
    return Object.entries(p).map(([k, v]) => ({ name: k, p: v.p, d: v.d, me: k === name })).sort((a, b) => b.p - a.p);
  }, [st, name]);
  const top = rows[0] ? Math.max(rows[0].p, 1) : 1;
  return (
    <Screen header={false}>
      <StatHeader title="Friend scoreboard" icon="people" color={colors.good} note="A weekly mini-league across every game. Each day you play earns 10 points plus 5 for each different game that day (up to 40 a day). The week resets on Monday." />
      {!name ? <Card><Note>Set your name first (Settings, Profile) so friends can see who you are.</Note></Card> : null}
      {st.loading ? <Note>Loading…</Note> : null}
      {st.pts != null ? (
        <Grad color={colors.good} from={0.4} to={0.06} radius={22} border style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.cardB }}>
          <View style={{ flex: 1 }}><Text style={{ color: colors.onSoft, fontSize: 12, fontWeight: '700', letterSpacing: 1.4 }}>{`YOUR WEEK · ${st.wk}`}</Text><Text style={{ color: colors.fg, fontSize: 34, fontWeight: '800', marginTop: 2 }}>{st.pts}</Text><Text style={{ color: colors.onSoft, fontSize: 13 }}>{`${st.days} day${st.days === 1 ? '' : 's'} played · max 280`}</Text></View>
          <Ionicons name="trophy" size={52} color={alpha(colors.gold, 0.85)} />
        </Grad>) : null}
      {!st.loading && !st.id ? (
        <Card style={{ gap: 10 }}><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '700' }}>Play against friends</Text>
          <Note>The scoreboard uses the same free room as the prediction league. Create or join a room there, then come back here.</Note>
          <Press onPress={() => navigation.navigate('Leaderboard')} accessibilityLabel="Open the prediction league"><View style={{ alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.accent }}><Text style={{ color: colors.onAccent, fontWeight: '800' }}>Open the league</Text></View></Press></Card>) : null}
      {st.error ? <Note>{`Could not reach the room (${st.error}). Showing the last list saved on this phone.`}</Note> : null}
      {st.id ? (<><SectionLabel color={colors.good}>This week</SectionLabel>
        <StatList>{rows.map((r, i) => <StatRow key={r.name} i={i} medal badge={i + 1} title={r.me ? `${r.name} (you)` : r.name} sub={`${r.d} day${r.d === 1 ? '' : 's'} played`} value={`${r.p} pts`} frac={Math.max(0.04, r.p / top)} color={r.me ? colors.accentText : colors.good} to={false} />)}</StatList>
        <Pressable onPress={() => setN((x) => x + 1)} accessibilityRole="button" style={{ alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8 }}><Text style={{ color: colors.accentText, fontWeight: '700' }}>Refresh</Text></Pressable>
        <Note>Friends appear once they have opened this screen this week. Messages stay on the free server for about 12 hours, so a friend who has not opened the app today may show from the last list saved on your phone.</Note></>) : null}
    </Screen>);
}

// ---- Rewind day: one famous race a day, with the real grid and result from the saved history ----
const STORIES = [
  [1950, 'British', 'The very first Formula 1 World Championship race, at Silverstone. Giuseppe Farina wins for Alfa Romeo.'],
  [1957, 'German', 'Juan Manuel Fangio hunts down the Ferraris after a pit stop at the Nürburgring, in what many call his greatest race.'],
  [1976, 'Japanese', 'A rain-soaked finale in Japan. Niki Lauda stops after two laps, and James Hunt finishes third to take the title by a single point.'],
  [1984, 'Monaco', 'Rain in Monaco. Alain Prost wins as the race is stopped early, with Ayrton Senna charging in a Toleman behind him.'],
  [1985, 'European', 'At Brands Hatch, Nigel Mansell takes the first win of his Formula 1 career.'],
  [1988, 'Japanese', 'Ayrton Senna stalls on the grid, fights through the field in the rain and wins his first world title.'],
  [1989, 'Japanese', 'Senna and Prost collide at the chicane. Senna is disqualified after rejoining, and Prost takes the title.'],
  [1990, 'Japanese', 'Senna and Prost collide again, this time at the first corner, and Senna clinches the championship.'],
  [1991, 'Canadian', 'Nigel Mansell slows on the final lap with the win in hand, and Nelson Piquet takes the victory.'],
  [1994, 'Australian', 'Michael Schumacher and Damon Hill collide in Adelaide, and Schumacher wins his first title by a single point.'],
  [1997, 'European', 'Michael Schumacher turns in on Jacques Villeneuve at Jerez and ends up in the gravel; he is later excluded from the championship.'],
  [1998, 'Belgian', 'A huge crash at the start of the Belgian Grand Prix; Damon Hill takes Jordan\'s first ever win.'],
  [2005, 'United States', 'Michelin teams withdraw on the formation lap because of tyre safety, leaving only six cars to start the race at Indianapolis.'],
  [2006, 'Japanese', 'Michael Schumacher\'s engine fails while leading, and Fernando Alonso wins to take the championship lead.'],
  [2008, 'Brazilian', 'Lewis Hamilton passes Timo Glock on the final corner of the final lap to win the title by one point.'],
  [2008, 'Italian', 'Sebastian Vettel wins in the wet at Monza from pole in a Toro Rosso, the youngest winner at the time.'],
  [2010, 'Abu Dhabi', 'Four drivers could win the title. Sebastian Vettel wins the race and becomes the youngest champion, while Fernando Alonso is stuck behind Vitaly Petrov.'],
  [2011, 'Canadian', 'The longest race in Formula 1 history, more than four hours with a long red flag. Jenson Button wins after dropping to last.'],
  [2012, 'Spanish', 'Pastor Maldonado wins from pole for Williams, the team\'s first victory in eight years.'],
  [2012, 'Brazilian', 'A chaotic, rainy final race. Sebastian Vettel spins on the first lap and still wins the title by three points.'],
  [2019, 'German', 'A wet and wild Hockenheim: Max Verstappen wins and Sebastian Vettel climbs from last on the grid to second.'],
  [2020, 'Bahrain', 'Romain Grosjean survives a fireball crash on the first lap. Lewis Hamilton goes on to win the restarted race.'],
  [2021, 'Paulo', 'Lewis Hamilton starts tenth after a grid penalty and wins in Brazil with an overtake on Max Verstappen.'],
  [2021, 'Abu Dhabi', 'Title decider: a late safety car and a restart on the final lap. Max Verstappen passes Lewis Hamilton to win his first championship.'],
];
function storyOf(i) {
  const [y, key, text] = STORIES[((i % STORIES.length) + STORIES.length) % STORIES.length];
  const rc = (() => { try { const rs = []; for (let r = 1; r <= 25; r++) { const x = raceRowsOf(y, r); if (!x) break; rs.push(x); } return rs.find((x) => String(x.name).includes(key)); } catch { return null; } })();
  return { y, text, rc };
}
export function RewindScreen() {
  const base = useMemo(() => seedOf(today()) % STORIES.length, []); const [off, setOff] = useState(0);
  const idx = base + off; const s = useMemo(() => storyOf(idx), [idx]);
  const rows = s.rc ? [...s.rc.rows].filter((r) => r.pos).sort((a, b) => a.pos - b.pos) : [];
  const gained = rows.filter((r) => r.grid > 0).map((r) => ({ ...r, g: r.grid - r.pos })).sort((a, b) => b.g - a.g)[0];
  const fin = (r) => /^(Finished|\+\d+ Laps?)$/i.test(String(r.status || '')); const dnf = s.rc ? s.rc.rows.filter((r) => !fin(r)).length : 0;
  return (
    <Screen header={false}>
      <StatHeader title="Rewind day" icon="play-back" color={colors.gold} note="One famous race a day, with the real grid and result. Swipe through more with the arrows." />
      <Grad color={colors.gold} from={0.4} to={0.06} radius={22} border style={{ padding: 18, backgroundColor: colors.cardB }}>
        <Text style={{ color: colors.onSoft, fontSize: 12, fontWeight: '800', letterSpacing: 1.6 }}>{`${s.y} · ${s.rc ? String(s.rc.name).toUpperCase() : ''}`}</Text>
        <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700', lineHeight: 25, marginTop: 8 }}>{s.text}</Text>
      </Grad>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Press onPress={() => setOff((o) => o - 1)} accessibilityLabel="Previous race"><View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}><Ionicons name="chevron-back" size={18} color={colors.accentText} /><Text style={{ color: colors.fg, fontWeight: '700' }}>Previous</Text></View></Press></View>
        <View style={{ flex: 1 }}><Press onPress={() => setOff((o) => o + 1)} accessibilityLabel="Next race"><View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.fg, fontWeight: '700' }}>Next</Text><Ionicons name="chevron-forward" size={18} color={colors.accentText} /></View></Press></View>
      </View>
      {s.rc ? (<>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[[s.rc.rows.length - dnf, 'finished'], [dnf, 'did not finish'], [gained && gained.g > 0 ? `+${gained.g}` : '—', gained && gained.g > 0 ? `${gained.name}` : 'places gained']].map(([v, l]) => (<View key={l} style={{ flex: 1, padding: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center' }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }} numberOfLines={1}>{l}</Text></View>))}
        </View>
        <SectionLabel color={colors.gold}>Top ten</SectionLabel>
        <View style={{ gap: 8 }}>{rows.slice(0, 10).map((r) => <ResultRow key={r.id} year={s.y} r={{ position: r.pos, driverId: r.id, first: String(r.full).split(' ')[0], last: r.name, team: r.team, teamId: r.teamId, grid: r.grid, points: r.pts, time: '' }} />)}</View>
      </>) : <Note>The result of this race is not in the saved history.</Note>}
    </Screen>);
}
