import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Switch, ScrollView } from 'react-native';
import { Alert } from '../lib/dialog';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Grad, { Scrim } from '../components/Grad';
import Press from '../components/Press';
import Reveal from '../components/Reveal';
import Dropdown from '../components/Dropdown';
import { Segmented, StatGrid } from '../components/Shared';
import ExportBar from '../components/ExportBar';
import { Avatar, Field, Stepper, Btn, Swatches, SessionCard } from '../components/FunBits';
import { useFun, pickImage, uid, canPickImage } from '../fun/store';
import { sessionsOf, standings, freeNumber, TEAM_COLORS } from '../fun/sim';
import { profileStats } from '../fun/profile';
import { usePrefs } from '../hooks/usePrefs';
import { kvGet, kvSet } from '../lib/kv';
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
  const fun = useFun(); const [pins, toggle] = usePins(); const st = useGameStatus();
  const live = fun.fantasies.filter((f) => !f.archived); const cur = live[0];
  let fInfo = fun.loaded ? 'Build your own season. Pick teams and races, then simulate.' : 'Loading your seasons…';
  if (cur) { const done = cur.races.filter((r) => sessionsOf(r).every((s) => cur.results?.[r.id]?.[s])).length; fInfo = `${live.length} saved season${live.length === 1 ? '' : 's'} · ${cur.name}: ${done}/${cur.races.length} races`; }
  return (
    <Screen>
      <Reveal index={0}><Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800', fontStyle: 'italic' }}>Other</Text></Reveal>
      <Reveal index={1}><View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Hero i={1} color={colors.purple} icon="stats-chart" kicker="NUMBERS" title="Statistics" info="Records, streaks, odds, season reviews and more" onPress={() => navigation.navigate('StatsHub')} height={150} /></View>
        <View style={{ flex: 1 }}><Hero i={1} color={colors.gold} icon="person-circle" kicker="YOU" title="My profile" info="Name, photo, favourites, number" onPress={() => navigation.navigate('Profile')} height={150} /></View>
      </View></Reveal>
      <Reveal index={1}><DailyBanner navigation={navigation} st={st} /></Reveal>
      <Reveal index={1}><ChallengeCard navigation={navigation} /></Reveal>
      {st.resume.length ? <ContinueRow navigation={navigation} st={st} pins={pins} toggle={toggle} /> : null}
      {pins.length ? <PinnedRow navigation={navigation} st={st} pins={pins} toggle={toggle} /> : null}
      <Hero i={2} color={colors.accent} icon="flag" kicker="FANTASY" title="Fantasy seasons" info={fInfo} onPress={() => navigation.navigate('FantasyHub')} />
      <Hero i={3} color={colors.gold} icon="game-controller" kicker="GAMES" title="Games and quizzes" info={`${GAMES.length} games: quizzes, puzzles, arcade, two-player and what-ifs`} onPress={() => navigation.navigate('FunGames')} />
      <Hero i={4} color={colors.red} icon="albums" kicker="COLLECT" title="Driver cards" info="Open packs and build your collection" onPress={() => navigation.navigate('Cards')} height={110} />
      <Hero i={5} color={colors.purple} icon="ribbon" kicker="ACHIEVE" title="Trophy room" info="Your achievements and personal bests" onPress={() => navigation.navigate('TrophyRoom')} height={100} />
      <Reveal index={6}><Note>Just for fun: nothing here touches the real data.</Note></Reveal>
    </Screen>
  );
}

/* ------------------------------------------------------------------ own profile */
export function FunProfile({ navigation }) {
  const fun = useFun(); const { prefs } = usePrefs(); const meta = usePaddockMeta(); const real = realNumbers(meta);
  const base = fun.profile || { name: prefs.opts.name || '', number: '', team: 'My Team', color: colors.accent, photo: null, seasons: [] };
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Eyebrow>Seasons raced</Eyebrow><Pressable onPress={addSeason} hitSlop={8}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>+ Add season</Text></Pressable></View>
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
