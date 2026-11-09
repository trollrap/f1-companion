import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import Dropdown from '../components/Dropdown';
import Grad from '../components/Grad';
import Press from '../components/Press';
import { Pill } from '../components/Badge';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useSeason';
import { LEAGUES, allScores, table, match, ymd, teamProfile } from '../api/football';
import { hm } from '../lib/time';
import { useFootFavs } from '../hooks/useFootFavs';
import { scheduleKickoff, cancelKickoff, hasKickoff } from '../lib/notifications';
import { colors, alpha } from '../theme';

const Crest = ({ uri, size = 26 }) => (uri ? <Image source={{ uri }} resizeMode="contain" style={{ width: size, height: size }} /> : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }} />);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function Game({ g, onPress, ff, onTeam }) {
  const live = g.state === 'in', done = g.state === 'post', sc = (x) => (x.score == null ? '' : String(x.score));
  return (
    <Press onPress={onPress}>
      <View style={[s.game, (ff.has(g.home.id) || ff.has(g.away.id)) && { borderLeftWidth: 3, borderLeftColor: colors.gold }, live && { borderColor: colors.accent, backgroundColor: alpha(colors.accent, 0.12) }]}>
        <View style={{ width: 54, alignItems: 'center' }}>
          {live ? <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 13 }}>{g.clock || 'LIVE'}</Text> : done ? <Text style={s.sub}>FT</Text> : <Text style={s.when}>{hm(Date.parse(g.date), null)}</Text>}
          {live ? <Text style={{ color: colors.accent, fontSize: 10, letterSpacing: 1 }}>LIVE</Text> : null}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          {[g.home, g.away].map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={() => t.id && onTeam && onTeam(t)} hitSlop={4}><Crest uri={t.logo} /></Pressable><Text style={[s.team, done && !t.winner && { color: colors.muted }]} numberOfLines={1}>{t.name}</Text><Text style={[s.score, live && { color: colors.accent }]}>{sc(t)}</Text>
            </View>))}
        </View>
      </View>
    </Press>
  );
}
export function FootScores({ navigation }) {
  const [off, setOff] = useState(0); const [lg, setLg] = useState('all'); const now = useNow(60000);
  const day = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + off); return d; }, [off, Math.floor(now / 3600000)]);
  const data = useAsync(() => allScores(ymd(day), off === 0), [ymd(day), off === 0 ? Math.floor(now / 30000) : 0]);
  const ff = useFootFavs();
  const list = (data.v || []).filter((g) => (lg === 'all' || (lg === 'mine' ? ff.has(g.home.id) || ff.has(g.away.id) : g.league.slug === lg)));
  const groups = LEAGUES.map((l) => ({ l, games: list.filter((g) => g.league.slug === l.slug).sort((a, b) => (b.state === 'in') - (a.state === 'in') || Date.parse(a.date) - Date.parse(b.date)) })).filter((x) => x.games.length);
  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[-3, -2, -1, 0, 1, 2, 3].map((k) => { const d = new Date(); d.setDate(d.getDate() + k); const on = k === off; return (
          <Pressable key={k} onPress={() => setOff(k)} style={[s.day, on && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}><Text style={[s.sub, on && { color: colors.fg }]}>{k === 0 ? 'Today' : DAYS[d.getDay()]}</Text><Text style={[s.dn, on && { color: colors.fg }]}>{d.getDate()}</Text></Pressable>); })}
      </View>
      <Dropdown value={lg} options={[['all', 'All leagues'], ['mine', 'My teams'], ...LEAGUES.map((l) => [l.slug, l.name])]} onChange={setLg} />
      {data.loading && <Skeleton rows={5} />}
      {data.error && <ErrorNote error={data.error} onRetry={data.reload} />}
      {data.v && list.some((g) => g.state === 'in') ? <Note>{`${list.filter((g) => g.state === 'in').length} live now. Live matches are listed first in each league.`}</Note> : null}
      {data.v && !groups.length && <Note>No matches on this day.</Note>}
      {groups.map(({ l, games }) => (
        <Card key={l.slug}><Eyebrow>{l.name}</Eyebrow><View style={{ marginTop: 8, gap: 8 }}>{games.map((g) => <Game key={g.id} g={g} ff={ff} onPress={() => navigation.navigate('FootMatch', { g })} onTeam={(t) => navigation.navigate('FootTeam', { slug: l.slug, id: t.id, name: t.name, logo: t.logo })} />)}</View></Card>))}
    </Screen>
  );
}
export function FootTable({ navigation }) {
  const [lg, setLg] = useState('eng.1'); const t = useAsync(() => table(lg), [lg]);
  const h = ['#', 'Team', 'P', 'W', 'D', 'L', 'GD', 'Pts'];
  return (
    <Screen>
      <Dropdown value={lg} options={LEAGUES.map((l) => [l.slug, l.name])} onChange={setLg} />
      {t.loading && <Skeleton rows={8} />}
      {t.error && <ErrorNote error={t.error} onRetry={t.reload} />}
      {t.v && !t.v.length && <Note>No table is published for this competition.</Note>}
      {t.v?.map((grp, gi) => (
        <Card key={gi}>
          {grp.name ? <Eyebrow>{grp.name}</Eyebrow> : null}
          <View style={[s.tr, { marginTop: 8 }]}>{h.map((x, i) => <Text key={x} style={[s.th, i === 1 && { flex: 1, textAlign: 'left' }, i !== 1 && { width: i === 0 ? 24 : 30 }]}>{x}</Text>)}</View>
          {grp.rows.map((r, i) => (
            <Pressable key={r.team + i} style={s.tr} onPress={() => r.id && navigation.navigate('FootTeam', { slug: lg, id: r.id, name: r.team, logo: r.logo })}>
              <Text style={[s.td, { width: 24 }]}>{r.rank ?? i + 1}</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}><Crest uri={r.logo} size={20} /><Text style={[s.td, { textAlign: 'left', flexShrink: 1 }]} numberOfLines={1}>{r.team}</Text></View>
              {[r.played, r.won, r.drawn, r.lost, r.gd].map((v, k) => <Text key={k} style={[s.td, { width: 30 }]}>{v ?? '–'}</Text>)}
              <Text style={[s.td, { width: 30, fontWeight: '800' }]}>{r.points ?? '–'}</Text>
            </Pressable>))}
        </Card>))}
    </Screen>
  );
}
export function FootMatch({ route, navigation }) {
  const { g } = route.params; const ff = useFootFavs(); const [bell, setBell] = useState(false); const [msg, setMsg] = useState('');
  React.useEffect(() => { hasKickoff(g.id).then(setBell); }, []);
  const ring = async () => {
    if (bell) { await cancelKickoff(g.id); setBell(false); setMsg('Reminder removed.'); return; }
    const r = await scheduleKickoff(g.id, `${g.home.name} - ${g.away.name}`, Date.parse(g.date));
    if (r === 'ok') { setBell(true); setMsg('You will get a reminder at kick-off.'); } else setMsg(r === 'past' ? 'This match has already started.' : r === 'denied' ? 'Notifications are not allowed for this app. Enable them in system settings.' : 'Alerts only work in the installed app.');
  }; const m = useAsync(() => match(g.league.slug, g.id), [g.id]); const x = m.v;
  const hs = x?.home || g.home, as = x?.away || g.away; const live = (x?.state || g.state) === 'in';
  return (
    <Screen header={false}>
      <Grad color={colors.accent} from={0.35} to={0.03} border={0.4} style={{ padding: 16 }}>
        <Text style={s.sub}>{g.league.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Pressable onPress={() => hs.id && navigation.navigate('FootTeam', { slug: g.league.slug, id: hs.id, name: hs.name, logo: hs.logo })} style={{ flex: 1, alignItems: 'center', gap: 6 }}><Crest uri={hs.logo} size={48} /><Text style={s.tn} numberOfLines={2}>{hs.name}</Text></Pressable>
          <View style={{ alignItems: 'center', width: 96 }}>
            <Text style={{ color: colors.fg, fontSize: 34, fontWeight: '800' }}>{hs.score == null ? hm(Date.parse(g.date), null) : `${hs.score} - ${as.score ?? ''}`}</Text>
            <Pill color={live ? colors.accent : colors.muted} solid={live}>{live ? 'In progress' : (x?.detail || g.detail || (g.state === 'post' ? 'Full time' : 'Upcoming'))}</Pill>
          </View>
          <Pressable onPress={() => as.id && navigation.navigate('FootTeam', { slug: g.league.slug, id: as.id, name: as.name, logo: as.logo })} style={{ flex: 1, alignItems: 'center', gap: 6 }}><Crest uri={as.logo} size={48} /><Text style={s.tn} numberOfLines={2}>{as.name}</Text></Pressable>
        </View>
        {(x?.venue || g.venue) ? <Text style={[s.sub, { textAlign: 'center', marginTop: 10 }]}>{x?.venue || g.venue}</Text> : null}
      </Grad>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {g.state === 'pre' && (
          <Pressable onPress={ring} style={({ pressed }) => [s.act, bell && { borderColor: colors.accent, backgroundColor: colors.accentSoft }, pressed && { opacity: 0.8 }]}><Ionicons name={bell ? 'notifications' : 'notifications-outline'} size={18} color={colors.accent} /><Text style={s.actT}>{bell ? 'Reminder on' : 'Remind me at kick-off'}</Text></Pressable>)}
        {[hs, as].map((t) => t.id ? (
          <Pressable key={t.id} onPress={() => ff.toggle(t.id)} style={({ pressed }) => [s.act, ff.has(t.id) && { borderColor: colors.gold }, pressed && { opacity: 0.8 }]}><Ionicons name={ff.has(t.id) ? 'star' : 'star-outline'} size={18} color={ff.has(t.id) ? colors.gold : colors.fg} /><Text style={s.actT} numberOfLines={1}>{t.short || t.name}</Text></Pressable>) : null)}
      </View>
      {msg ? <Note>{msg}</Note> : null}
      {m.loading && <Skeleton rows={4} />}
      {x?.events?.length > 0 && <Card><Eyebrow>Key events</Eyebrow><View style={{ marginTop: 8 }}>{x.events.map((k, i) => (<View key={i} style={s.ev}><Text style={s.min}>{k.minute}</Text><View style={{ flex: 1 }}><Text style={s.td2}>{k.type}</Text><Text style={s.sub}>{[k.text, k.team].filter(Boolean).join(' · ')}</Text></View></View>))}</View></Card>}
      {x?.stats?.length === 2 && Object.keys(x.stats[0].stats).length > 0 && (
        <Card><Eyebrow>Statistics</Eyebrow><View style={{ marginTop: 8 }}>{Object.keys(x.stats[0].stats).map((k) => (<View key={k} style={s.ev}><Text style={[s.td2, { width: 56 }]}>{x.stats[0].stats[k]}</Text><Text style={[s.sub, { flex: 1, textAlign: 'center' }]}>{k}</Text><Text style={[s.td2, { width: 56, textAlign: 'right' }]}>{x.stats[1].stats[k] ?? '–'}</Text></View>))}</View></Card>)}
      {m.v && !x.events.length && !x.stats.length && <Note>No further details are published for this match yet.</Note>}
      {m.error && <Note>Details are not available right now.</Note>}
    </Screen>
  );
}
export function FootTeam({ route }) {
  const { slug, id, name, logo } = route.params; const ff = useFootFavs(); const t = useAsync(() => teamProfile(slug, id), [slug, id]); const x = t.v; const [all, setAll] = useState(false);
  const col = x?.color || colors.accent; const lg = LEAGUES.find((l) => l.slug === slug); const tn = x?.name || name;
  const games = x?.games || []; const past = games.filter((g) => g.state === 'post'), next = games.filter((g) => g.state !== 'post'); const form = past.slice(-5);
  const W = past.filter((g) => g.winner === 'W').length, D = past.filter((g) => g.winner === 'D').length, L = past.filter((g) => g.winner === 'L').length;
  const gf = past.reduce((a, g) => a + (g.mine || 0), 0), ga = past.reduce((a, g) => a + (g.theirs || 0), 0);
  const stat = [['Played', past.length], ['Won', W], ['Drawn', D], ['Lost', L], ['Goals for', gf], ['Goals against', ga]];
  const groups = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']; const pl = x?.players || []; const known = (p) => groups.find((g) => p.pos.toLowerCase().startsWith(g.toLowerCase().slice(0, 4)));
  const shown = (g) => pl.filter((p) => (known(p) || 'Other') === g);
  const dt = (iso) => { const d = new Date(iso); return `${DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };
  const line = (g) => (<View key={g.id} style={s.ev}><Text style={[s.sub, { width: 74 }]}>{dt(g.date)}</Text><Crest uri={g.oppLogo} size={22} /><View style={{ flex: 1 }}><Text style={s.td2} numberOfLines={1}>{`${g.home ? 'vs' : '@'} ${g.opp}`}</Text></View>
    {g.state === 'post' ? <><Text style={s.td2}>{`${g.mine ?? '–'} - ${g.theirs ?? '–'}`}</Text><View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: g.winner === 'W' ? colors.good : g.winner === 'L' ? colors.accent : colors.muted }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{g.winner}</Text></View></> : <Text style={s.when}>{hm(Date.parse(g.date), null)}</Text>}</View>);
  return (
    <Screen header={false}>
      <Grad color={col} from={0.55} to={0.05} border={0.45} style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Crest uri={x?.logo || logo} size={64} />
          <View style={{ flex: 1 }}><Text style={s.sub}>{lg?.name || ''}</Text><Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }} numberOfLines={2}>{tn}</Text>{x?.standing ? <Text style={s.sub}>{x.standing}</Text> : null}{x?.venue ? <Text style={s.sub}>{x.venue}</Text> : null}</View>
          <Pressable onPress={() => ff.toggle(id)} hitSlop={8} accessibilityLabel="Favourite team"><Ionicons name={ff.has(id) ? 'star' : 'star-outline'} size={26} color={ff.has(id) ? colors.gold : colors.fg} /></Pressable>
        </View>
      </Grad>
      {t.loading && <Skeleton rows={5} />}
      {t.v && !pl.length && !games.length ? <Note>No details are published for this team right now.</Note> : null}
      {past.length > 0 && (
        <Card>
          <Eyebrow>Season so far</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{stat.map(([k, v]) => <View key={k} style={{ width: '31.5%', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10 }}><Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 9, letterSpacing: 1.2 }}>{k.toUpperCase()}</Text><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800', marginTop: 2 }}>{String(v)}</Text></View>)}</View>
          {form.length > 0 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}><Text style={s.sub}>Form</Text>{form.map((g) => <View key={g.id} style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: g.winner === 'W' ? colors.good : g.winner === 'L' ? colors.accent : colors.muted }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{g.winner}</Text></View>)}</View> : null}
          <Note>Counted from the matches in this competition's schedule.</Note>
        </Card>)}
      {next.length > 0 && <Card><Eyebrow>Next matches</Eyebrow><View style={{ marginTop: 8 }}>{next.slice(0, 5).map(line)}</View></Card>}
      {past.length > 0 && <Card><Eyebrow>Recent results</Eyebrow><View style={{ marginTop: 8 }}>{[...past].reverse().slice(0, all ? 40 : 6).map(line)}</View>{past.length > 6 ? <Pressable onPress={() => setAll(!all)} style={{ paddingTop: 10 }}><Text style={{ color: colors.accent, fontWeight: '700' }}>{all ? 'Show fewer' : 'Show all results'}</Text></Pressable> : null}</Card>}
      {pl.length > 0 && [...groups, 'Other'].map((g) => shown(g).length ? (
        <Card key={g}><Eyebrow>{g === 'Other' ? 'Squad' : g + 's'}</Eyebrow><View style={{ marginTop: 8 }}>{shown(g).map((p) => (
          <View key={p.id || p.name} style={s.ev}><Text style={[s.min, { width: 32 }]}>{p.number ?? ''}</Text><View style={{ flex: 1 }}><Text style={s.td2} numberOfLines={1}>{p.name}</Text><Text style={s.sub} numberOfLines={1}>{[p.country, p.age ? `${p.age} yrs` : ''].filter(Boolean).join(' · ')}</Text></View></View>))}</View></Card>) : null)}
    </Screen>
  );
}
const s = StyleSheet.create({
  act: { flex: 1, height: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }, actT: { color: colors.fg, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  sub: { color: colors.muted, fontSize: 13 }, when: { color: colors.fg, fontWeight: '700', fontSize: 15 }, team: { color: colors.fg, fontSize: 17, fontWeight: '700', flex: 1 }, score: { color: colors.fg, fontSize: 19, fontWeight: '800', width: 28, textAlign: 'right' },
  game: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  day: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }, dn: { color: colors.muted, fontWeight: '800', fontSize: 16 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line }, th: { color: colors.muted, fontSize: 11, fontFamily: 'label', textAlign: 'center' }, td: { color: colors.fg, fontSize: 15, textAlign: 'center' },
  tn: { color: colors.fg, fontSize: 16, fontWeight: '700', textAlign: 'center' }, ev: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line }, min: { color: colors.accent, fontWeight: '800', width: 44 }, td2: { color: colors.fg, fontSize: 15, fontWeight: '700' },
});
