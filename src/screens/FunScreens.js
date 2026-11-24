import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Switch, ScrollView } from 'react-native';
import { Alert } from '../lib/dialog';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Grad, { Scrim } from '../components/Grad';
import Press from '../components/Press';
import { Avatar as ProfileAvatar, useProfile } from '../components/Avatar';
import Reveal from '../components/Reveal';
import Dropdown from '../components/Dropdown';
import { Segmented, StatGrid } from '../components/Shared';
import ExportBar from '../components/ExportBar';
import { Avatar, Field, Stepper, Btn, Swatches, SessionCard } from '../components/FunBits';
import { useFun, pickImage, uid, canPickImage } from '../fun/store';
import { sessionsOf, standings, freeNumber, TEAM_COLORS } from '../fun/sim';
import { profileStats } from '../fun/profile';
import { usePrefs } from '../hooks/usePrefs';
import { kvGet, kvSet, today } from '../lib/kv';
import { useFocusEffect } from '@react-navigation/native';
import { loadCards } from '../lib/cards';
import { TROPHIES } from './TrophyRoom';
import { GRID_2027 } from '../data/season2027';
import { runOf } from '../lib/shield';
import { usePaddockMeta } from '../hooks/useTeams';
import { CIRCUITS } from '../data/circuits';
import { colors, alpha } from '../theme';
import { GAMES } from '../lib/gameCatalog';
import { ChallengeCard } from './Challenges158';
import { DailyBanner, ContinueRow, PinnedRow, useGameStatus, usePins } from './GamesHub';

const realNumbers = (meta) => Object.entries(meta?.drivers || {}).map(([id, d]) => ({ id, number: Number(d.number), name: id.replace(/_/g, ' ') })).filter((x) => x.number);
const dash = (v) => (v == null ? '—' : String(v));
export const nameParts = (full) => { const [first, ...rest] = String(full || '').trim().split(/\s+/); return { first: first || '', last: rest.join(' ') }; };

/* ------------------------------------------------------------------ Fun home (tab) */
function Hero({ i, color, icon, kicker, title, info, onPress, height = 128, children }) {
  return (
    <Reveal index={i}>
      <Press onPress={onPress} accessibilityLabel={`${title}. ${info}`}>
        <Grad color={color} from={0.55} to={0.08} radius={18} border={0.5} style={{ height }}>
          {children}
          <Ionicons name={icon} size={92} color={alpha(colors.fg, 0.07)} style={{ position: 'absolute', right: 10, bottom: -14 }} />
          <View style={{ flex: 1, padding: 14, justifyContent: 'space-between' }}>
            <Text style={{ color: colors.onSoft, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>{kicker}</Text>
            <View>
              <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic' }} numberOfLines={1}>{title}</Text>
              <Text style={{ color: colors.onSoft, fontSize: 15 }} numberOfLines={2}>{info}</Text>
            </View>
          </View>
          <View style={{ position: 'absolute', right: 12, top: 12 }}><Ionicons name="chevron-forward" size={20} color={colors.onSoft} /></View>
        </Grad>
      </Press>
    </Reveal>);
}
export function FunHome({ navigation }) {
  const [profile] = useProfile(); const fun = useFun(); const [pins, toggle] = usePins(); const st = useGameStatus();
  const live = fun.fantasies.filter((f) => !f.archived); const cur = live[0];
  let fInfo = fun.loaded ? 'Build your own season. Pick teams and races, then simulate.' : 'Loading your seasons…';
  if (cur) { const done = cur.races.filter((r) => sessionsOf(r).every((s) => cur.results?.[r.id]?.[s])).length; fInfo = `${live.length} saved season${live.length === 1 ? '' : 's'} · ${cur.name}: ${done}/${cur.races.length} races`; }
  const [tally, setTally] = useState(null);
  useFocusEffect(useCallback(() => { let off = false; (async () => { const m = await loadCards().catch(() => ({ owned: {}, keys: {} })); const keys = m.keys || {}; if (!off) setTally({ trophies: TROPHIES.filter((t) => keys[t[0]]).length, cards: Object.keys(m.owned || {}).length }); })(); return () => { off = true; }; }, []));
  const streak = st.loaded ? runOf(new Set(st.days), today()).cur : null;
  const sub = [profile.teamId ? (GRID_2027.find((t) => t.teamId === profile.teamId) || {}).name : null, profile.driverId ? String(profile.driverId).replace(/_/g, ' ') : null].filter(Boolean).join(' · ');
  const tile = (c, ic, label, to) => (
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => navigation.navigate(to)} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}>
      <View style={{ height: 92, borderRadius: 22, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: 'space-between' }}>
        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: alpha(c, 0.28), alignItems: 'center', justifyContent: 'center' }}><Ionicons name={ic} size={17} color={c} /></View>
        <Text style={{ color: colors.fg, fontWeight: '800', fontSize: 16 }}>{label}</Text>
      </View>
    </Pressable>);
  const row = (c, ic, label, subt, to) => (
    <Pressable key={label} accessibilityRole="button" onPress={() => navigation.navigate(to)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.85 }]}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: alpha(c, 0.22), alignItems: 'center', justifyContent: 'center' }}><Ionicons name={ic} size={18} color={c} /></View>
      <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>{label}</Text>{subt ? <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{subt}</Text> : null}</View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>);
  const gtile = (c, kick, label, onPress, key) => (
    <Pressable key={key || label} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }}>
      <Grad color={c} from={0.25} to={0.03} radius={22} border={0.35} style={{ width: 150, height: 110, padding: 14, justifyContent: 'space-between' }}>
        <Text style={{ color: c, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }}>{kick}</Text>
        <Text style={{ color: colors.fg, fontWeight: '800', fontSize: 16 }} numberOfLines={2}>{label}</Text>
      </Grad>
    </Pressable>);
  const KICK = { quiz: 'QUIZ', daily: 'DAILY', arcade: 'ARCADE', puzzle: 'PUZZLE', predict: 'PREDICT', two: 'TWO PLAYERS', whatif: 'WHAT IF' };
  return (
    <Screen>
      <Reveal index={0}><Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800' }}>Other</Text></Reveal>
      <Reveal index={1}><Press onPress={() => navigation.navigate('Profile')} accessibilityLabel="My profile">
        <Grad color={colors.accent} from={0.3} to={0.02} radius={28} border={0.4} style={{ padding: 18 }}>
          <Text style={{ color: colors.accentText, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 }}>F1 COMPANION PROFILE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 }}>
            <ProfileAvatar p={profile} size={68} />
            <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800' }} numberOfLines={1}>{profile.name || 'Create your profile'}</Text><Text style={{ color: colors.onSoft, fontSize: 12 }} numberOfLines={1}>{sub || 'Name, photo, favourites and number'}</Text></View>
            {profile.number ? <Text style={{ color: alpha(colors.fg, 0.85), fontSize: 44, fontWeight: '800', fontStyle: 'italic' }}>{profile.number}</Text> : <Ionicons name="chevron-forward" size={22} color={colors.fg} />}
          </View>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
            {[[tally ? `${tally.trophies}/${TROPHIES.length}` : '–', 'Trophies', colors.gold], [tally ? String(tally.cards) : '–', 'Cards', colors.fg], [streak == null ? '–' : String(streak), 'Day streak', colors.fg]].map(([v, l, c]) => (
              <View key={l}><Text style={{ color: c, fontSize: 20, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{l}</Text></View>))}
          </View>
        </Grad>
      </Press></Reveal>
      <Reveal index={2}><View style={{ flexDirection: 'row', gap: 12 }}>{tile(colors.purple, 'stats-chart', 'Statistics', 'StatsHub')}{tile(colors.good, 'flag', 'Fantasy', 'FantasyHub')}</View></Reveal>
      {st.resume.length ? <ContinueRow navigation={navigation} st={st} pins={pins} toggle={toggle} /> : null}
      {pins.length ? <PinnedRow navigation={navigation} st={st} pins={pins} toggle={toggle} /> : null}
      <Reveal index={3}><View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}><Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1.8, fontWeight: '700' }}>GAMES</Text><Pressable onPress={() => navigation.navigate('FunGames')} hitSlop={8}><Text style={{ color: colors.accentText, fontWeight: '700', fontSize: 14 }}>{`All ${GAMES.length}`}</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {gtile(colors.gold, 'DAILY', 'Daily puzzle', () => navigation.navigate('DailyPuzzle'))}
          {gtile(colors.good, 'DAILY', 'Daily challenges', () => navigation.navigate('DailyChallenges'))}
          {GAMES.slice(0, 12).map((g, gi) => gtile([colors.gold, colors.good, colors.purple, colors.accent][gi % 4], KICK[g.c] || String(g.c || 'GAME').toUpperCase(), g.n, () => navigation.navigate(g.r), g.r))}
        </ScrollView>
      </View></Reveal>
      <Reveal index={4}><Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1.8, fontWeight: '700' }}>YOU</Text></Reveal>
      <Reveal index={5}><View style={{ gap: 8 }}>
        {row(colors.accent, 'person', 'Edit profile', null, 'Profile')}
        {row(colors.gold, 'ribbon', 'Trophy room', 'Your achievements and personal bests', 'TrophyRoom')}
        {row(colors.red, 'albums', 'Driver cards', 'Open packs and build your collection', 'Cards')}
        {row(colors.purple, 'game-controller', 'Games and quizzes', `${GAMES.length} games: quizzes, puzzles, arcade, two-player`, 'FunGames')}
        {row(colors.good, 'flag', 'Fantasy seasons', fInfo, 'FantasyHub')}
      </View></Reveal>
      <Reveal index={6}><Note>Just for fun: nothing here touches the real data.</Note></Reveal>
    </Screen>
  );
}

/* ------------------------------------------------------------------ own profile */
export function FunProfile({ navigation }) {
  const fun = useFun(); const { prefs } = usePrefs(); const meta = usePaddockMeta(); const real = realNumbers(meta);
  const base = fun.profile || { name: prefs.opts.name || '', number: '', team: 'My Team', color: colors.accentText, photo: null, seasons: [] };
  const [d, setD] = useState(base); const [msg, setMsg] = useState(''); const [dirty, setDirty] = useState(false); const init = useRef(false);
  useEffect(() => { if (fun.loaded && !init.current) { init.current = true; if (fun.profile) setD(fun.profile); } }, [fun.loaded]);
  const set = (k, v) => { setD((x) => ({ ...x, [k]: v })); setDirty(true); };
  const num = Number(d.number); const clash = d.number !== '' && real.find((x) => x.number === num);
  const numErr = d.number !== '' && (!/^\d{1,2}$/.test(String(d.number)) || num < 1) ? 'Use a number from 1 to 99.' : clash ? `#${num} belongs to ${clash.name} on the real grid. Pick another.` : '';
  const stats = profileStats(d, fun.fantasies);
  const photo = async () => { const r = await pickImage(); if (r.uri) set('photo', r.uri); else if (r.error) setMsg(r.error); };
  const save = () => {
    if (numErr) { setMsg(numErr); return; }
    const p = { ...d, number: d.number === '' ? '' : Number(d.number) }; fun.saveProfile(p); setDirty(false); setMsg('Saved.');
    // the same driver in a fantasy season follows the profile; anybody who already has that number gets a free one
    fun.fantasies.forEach((f) => { const me = f.drivers.find((x) => x.me); if (!me) return;
      fun.update(f.id, (g) => { const taken = [...real.map((x) => x.number), p.number]; return { ...g, drivers: g.drivers.map((x) => (x.me ? { ...x, ...nameParts(p.name), name: p.name, number: p.number || x.number, photo: p.photo } : x.number === p.number ? { ...x, number: freeNumber([...taken, ...g.drivers.map((y) => y.number)]) } : x)) }; }); });
  };
  const addSeason = () => set('seasons', [{ id: uid(), year: new Date().getFullYear(), team: d.team || 'My Team', races: [] }, ...d.seasons]);
  const upSeason = (id, fn) => set('seasons', d.seasons.map((s) => (s.id === id ? fn(s) : s)));
  return (
    <Screen header={false}>
      <Grad color={d.color || colors.accent} from={0.68} to={0.06} border={0.5} style={{ height: 210 }}>
        {d.photo ? <View style={{ position: 'absolute', right: -10, bottom: -10 }}><Avatar uri={d.photo} size={220} radius={24} color={d.color} /></View> : d.number !== '' ? <Text style={{ position: 'absolute', right: 8, bottom: -22, fontFamily: 'display', fontWeight: '800', fontSize: 150, color: colors.onSoft }}>{d.number}</Text> : null}
        {d.photo ? <Scrim dir="h" from={0.7} to={0} style={{ right: '25%' }} /> : null}
        <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
          <Text style={{ color: colors.fg, fontFamily: 'display', fontWeight: '800', fontSize: 30 }}>{d.number !== '' ? `#${d.number}` : ''}</Text>
          <View style={{ maxWidth: '62%' }}>
            <Text style={{ color: colors.onSoft, fontSize: 18 }} numberOfLines={1}>{nameParts(d.name).first}</Text>
            <Text style={{ fontFamily: 'display', fontStyle: 'italic', fontWeight: '800', fontSize: 34, color: colors.fg, lineHeight: 40 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{nameParts(d.name).last || 'Your name'}</Text>
            <Text style={{ color: colors.fg, fontSize: 17, fontWeight: '600' }}>{d.team}</Text>
          </View>
        </View>
      </Grad>
      <Card>
        <Eyebrow>Your driver</Eyebrow>
        <View style={{ gap: 12, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn icon="image-outline" onPress={photo} style={{ flex: 1 }}>{d.photo ? 'Change photo' : 'Upload photo'}</Btn>
            {d.photo ? <Btn icon="trash-outline" onPress={() => set('photo', null)}>Remove</Btn> : null}
          </View>
          {!canPickImage() ? <Note>Photos need the newest app build.</Note> : null}
          <Field label="Name" value={d.name} onChange={(v) => set('name', v)} placeholder="Your name" maxLength={28} />
          <Field label="Car number (1-99)" value={d.number} onChange={(v) => set('number', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} />
          {numErr ? <Text style={{ color: colors.gold, fontSize: 15 }}>{numErr}</Text> : d.number !== '' ? <Text style={{ color: colors.muted, fontSize: 14 }}>Free: nobody on the real grid uses this number, and fantasy drivers will avoid it.</Text> : null}
          <Field label="Team" value={d.team} onChange={(v) => set('team', v)} placeholder="Team name" maxLength={28} />
          <Swatches value={d.color} onChange={(c) => set('color', c)} list={TEAM_COLORS} />
          <Btn tone="solid" icon="save-outline" onPress={save} disabled={!dirty && !!fun.profile}>Save driver</Btn>
          {msg ? <Text style={{ color: colors.muted, fontSize: 15 }}>{msg}</Text> : null}
        </View>
      </Card>
      <Card>
        <Eyebrow>Career</Eyebrow>
        <StatGrid cols={3} items={[['Seasons', dash(stats.seasons)], ['Races', dash(stats.races)], ['Wins', dash(stats.wins)], ['Podiums', dash(stats.podiums)], ['Poles', dash(stats.poles)], ['Best finish', stats.best ? `P${stats.best}` : '—'], ['Points', dash(stats.points)], ['DNF', dash(stats.dnf)], ['First year', dash(stats.first)]]} />
        <Note>Counts the seasons you add below and every fantasy season where you are the marked driver.</Note>
      </Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Eyebrow>Seasons raced</Eyebrow><Pressable onPress={addSeason} hitSlop={8}><Text style={{ color: colors.accentText, fontWeight: '700', fontSize: 16 }}>+ Add season</Text></Pressable></View>
      {d.seasons.length === 0 && <Note>Add the seasons you raced in, then your results race by race.</Note>}
      {d.seasons.map((s) => <SeasonEditor key={s.id} s={s} color={d.color} onChange={(fn) => upSeason(s.id, fn)} onDelete={() => set('seasons', d.seasons.filter((x) => x.id !== s.id))} />)}
      {dirty ? <Note>You have unsaved changes: tap Save driver.</Note> : null}
    </Screen>
  );
}
function SeasonEditor({ s, color, onChange, onDelete }) {
  const [race, setRace] = useState(''); const [grid, setGrid] = useState(''); const [pos, setPos] = useState('');
  const add = () => { if (!race.trim()) return; onChange((x) => ({ ...x, races: [...x.races, { id: uid(), race: race.trim(), grid, pos: pos.trim().toUpperCase() === 'DNF' || pos === '' ? 'DNF' : pos }] })); setRace(''); setGrid(''); setPos(''); };
  return (
    <Grad color={color} from={0.3} to={0.04} radius={16} border={0.3} style={{ padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <Field label="Year" value={s.year} onChange={(v) => onChange((x) => ({ ...x, year: v.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" maxLength={4} style={{ width: 90 }} />
        <Field label="Team" value={s.team} onChange={(v) => onChange((x) => ({ ...x, team: v }))} style={{ flex: 1 }} />
        <Pressable onPress={onDelete} hitSlop={8} style={{ height: 46, justifyContent: 'center' }}><Ionicons name="trash-outline" size={22} color={colors.muted} /></Pressable>
      </View>
      {s.races.map((r) => (
        <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
          <Text style={{ flex: 1, color: colors.fg, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{r.race}</Text>
          <Text style={{ color: colors.muted, fontSize: 14 }}>{r.grid ? `Grid ${r.grid}` : ''}</Text>
          <Text style={{ color: /^\d+$/.test(r.pos) && Number(r.pos) <= 3 ? colors.gold : colors.fg, fontWeight: '800', fontSize: 16, minWidth: 40, textAlign: 'right' }}>{/^\d+$/.test(r.pos) ? `P${r.pos}` : 'DNF'}</Text>
          <Pressable onPress={() => onChange((x) => ({ ...x, races: x.races.filter((y) => y.id !== r.id) }))} hitSlop={8}><Ionicons name="close" size={18} color={colors.muted} /></Pressable>
        </View>))}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <Field label="Race" value={race} onChange={setRace} placeholder="e.g. Monaco" style={{ flex: 1 }} />
        <Field label="Grid" value={grid} onChange={(v) => setGrid(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} style={{ width: 58 }} />
        <Field label="Finish" value={pos} onChange={(v) => setPos(v.replace(/[^0-9a-zA-Z]/g, ''))} placeholder="DNF" maxLength={3} style={{ width: 66 }} />
        <Pressable onPress={add} style={{ width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}><Ionicons name="add" size={24} color="#fff" /></Pressable>
      </View>
    </Grad>
  );
}
