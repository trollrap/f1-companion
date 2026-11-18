import React, { useCallback, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Note } from '../components/Screen';
import Grad from '../components/Grad';
import Press from '../components/Press';
import Reveal from '../components/Reveal';
import { streaks } from '../components/PlayCalendar';
import { colors, alpha } from '../theme';
import { kvGet, kvSet, today } from '../lib/kv';
import * as hap from '../lib/haptics';
import { CATS, GAMES, byRoute, catOf } from '../lib/gameCatalog';

// ---- data: pins, best scores, saved games, play days ----
import { ChallengeCard } from './Challenges158';
export function usePins() {
  const [pins, setPins] = useState([]);
  useFocusEffect(useCallback(() => { let off = false; kvGet('pins:games', []).then((v) => { if (!off && Array.isArray(v)) setPins(v.filter((r) => byRoute[r])); }); return () => { off = true; }; }, []));
  const toggle = (route) => { hap.tap(); setPins((cur) => { const n = cur.includes(route) ? cur.filter((x) => x !== route) : [...cur, route]; kvSet('pins:games', n); return n; }); };
  return [pins, toggle];
}
export function useGameStatus() {
  const [st, setSt] = useState({ best: {}, resume: [], days: [], loaded: false });
  useFocusEffect(useCallback(() => { let off = false; (async () => {
    const best = {}, resume = []; const days = await kvGet('playDays', []);
    await Promise.all(GAMES.map(async (g) => {
      if (g.b) { const v = await kvGet(g.b, 0); if (typeof v === 'number' && v > 0) best[g.r] = v; }
      if (g.k) { const s = await kvGet(`game:${g.k}`, null); const x = s && s.g; if (x && !x.over && (g.k.startsWith('run:') ? (x.i || 0) > 0 : Object.keys(x).length > 0)) resume.push(g.r); }
    }));
    if (!off) setSt({ best, resume, days: Array.isArray(days) ? days : [], loaded: true });
  })(); return () => { off = true; }; }, []));
  return st;
}
const fmtBest = (g, v) => (g.f ? g.f.replace('{}', v) : `${v}`);

// ---- tiles ----
function Pill({ text, color, solid }) {
  return <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: solid ? color : alpha(color, 0.2) }}><Text style={{ color: solid ? '#000' : colors.fg, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>{text}</Text></View>;
}
export function GameTile({ g, pinned, onPin, onOpen, best, resumable, wide }) {
  const cat = catOf(g.c);
  return (
    <View style={wide ? { flex: 1 } : { width: 160 }}>
      <Press onPress={onOpen} scale={0.96} accessibilityLabel={`${g.n}. ${g.s}${best ? `. Best ${fmtBest(g, best)}` : ''}${resumable ? '. In progress' : ''}`}>
        <Grad color={cat.color} from={0.34} to={0.05} border={resumable ? 0.9 : 0.38} radius={20} style={{ height: 138, padding: 13 }}>
          <Ionicons name={g.i} size={96} color={alpha(cat.color, 0.16)} style={{ position: 'absolute', right: -12, bottom: -14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: alpha(cat.color, 0.28), alignItems: 'center', justifyContent: 'center' }}><Ionicons name={g.i} size={20} color={colors.fg} /></View>
            <View style={{ flexDirection: 'row', gap: 4 }}>{resumable ? <Pill text="RESUME" color={cat.color} solid /> : g.nw ? <Pill text="NEW" color={cat.color} /> : null}{g.two ? <Pill text="2P" color={cat.color} /> : null}</View>
          </View>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800', lineHeight: 18 }} numberOfLines={2}>{g.n}</Text>
            <Text style={{ color: colors.onSoft, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{best ? `Best ${fmtBest(g, best)}` : g.s}</Text>
          </View>
        </Grad>
      </Press>
      <Pressable accessibilityRole="button" accessibilityLabel={pinned ? `Unpin ${g.n}` : `Pin ${g.n}`} hitSlop={10} onPress={onPin} style={{ position: 'absolute', right: 6, top: 38, padding: 6 }}>
        <Ionicons name={pinned ? 'star' : 'star-outline'} size={16} color={pinned ? colors.gold : alpha(colors.fg, 0.55)} />
      </Pressable>
    </View>);
}

// ---- strips ----
const Head = ({ color, title, sub, right }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <View style={{ width: 4, height: 30, borderRadius: 2, backgroundColor: color }} />
    <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }}>{title}</Text>{sub ? <Text style={{ color: colors.muted, fontSize: 12 }}>{sub}</Text> : null}</View>
    {right}
  </View>);
export function Strip({ games, st, pins, toggle, navigation }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 12 }} decelerationRate="fast" snapToInterval={170} snapToAlignment="start">
      {games.map((g) => <GameTile key={g.r} g={g} best={st.best[g.r]} resumable={st.resume.includes(g.r)} pinned={pins.includes(g.r)} onPin={() => toggle(g.r)} onOpen={() => navigation.navigate(g.r)} />)}
    </ScrollView>);
}
export function DailyBanner({ navigation, st }) {
  const played = st.days.includes(today()); const cur = streaks(st.days).cur; const c = catOf('daily').color;
  return (
    <Press onPress={() => navigation.navigate('DailyPuzzle')} scale={0.98} accessibilityLabel="Daily puzzle">
      <Grad color={c} from={0.55} to={0.08} border={0.55} radius={22} style={{ padding: 16, minHeight: 124 }}>
        <Ionicons name="today" size={130} color={alpha(c, 0.18)} style={{ position: 'absolute', right: -16, bottom: -24 }} />
        <Text style={{ color: colors.onSoft, fontFamily: 'label', fontSize: 11, letterSpacing: 2 }}>TODAY</Text>
        <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', fontStyle: 'italic', marginTop: 2 }}>Daily puzzle</Text>
        <Text style={{ color: colors.onSoft, fontSize: 14, marginTop: 2 }}>Five questions, the same for everyone.</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Pill text={played ? 'PLAYED TODAY' : 'PLAY NOW'} color={c} solid={!played} />
          {cur > 0 ? <Pill text={`${cur} DAY STREAK`} color={c} /> : null}
        </View>
      </Grad>
    </Press>);
}
export function ContinueRow({ navigation, st, pins, toggle }) {
  const list = st.resume.map((r) => byRoute[r]).filter(Boolean); if (!list.length) return null;
  return (<View style={{ gap: 10 }}><Head color={colors.accent} title="Continue" sub="Games you left unfinished" /><Strip games={list} st={st} pins={pins} toggle={toggle} navigation={navigation} /></View>);
}
export function PinnedRow({ navigation, st, pins, toggle }) {
  const list = pins.map((r) => byRoute[r]).filter(Boolean); if (!list.length) return null;
  return (<View style={{ gap: 10 }}><Head color={colors.gold} title="Pinned" sub="Your favourites" /><Strip games={list} st={st} pins={pins} toggle={toggle} navigation={navigation} /></View>);
}

// ---- the hub ----
export function GamesHub({ navigation }) {
  const st = useGameStatus(); const [pins, toggle] = usePins(); const [q, setQ] = useState(''); const [cat, setCat] = useState('all');
  const query = q.trim().toLowerCase();
  const shown = useMemo(() => GAMES.filter((g) => (cat === 'all' || g.c === cat) && (!query || `${g.n} ${g.s}`.toLowerCase().includes(query))), [cat, query]);
  const filtering = !!query || cat !== 'all';
  const surprise = () => { hap.tap(); const pool = GAMES.filter((g) => !g.two && g.c !== 'predict' && g.c !== 'whatif'); navigation.navigate(pool[Math.floor(Math.random() * pool.length)].r); };
  const played = new Set(st.days).size;
  return (
    <Screen>
      <Reveal index={0}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View><Text style={{ color: colors.fg, fontSize: 28, fontWeight: '800', fontStyle: 'italic' }}>Games</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`${GAMES.length} games · saved as you play${played ? ` · ${played} days played` : ''}`}</Text></View>
          <Press onPress={surprise} scale={0.94} accessibilityLabel="Surprise me"><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, backgroundColor: colors.accent }}><Ionicons name="shuffle" size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Surprise me</Text></View></Press>
        </View>
      </Reveal>
      <Reveal index={1}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search games" placeholderTextColor={colors.muted} autoCorrect={false} accessibilityLabel="Search games" style={{ flex: 1, color: colors.fg, fontSize: 16, paddingVertical: 11 }} />
          {q ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQ('')}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
        </View>
      </Reveal>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {[{ id: 'all', label: 'All', color: colors.accent }, ...CATS].map((c) => { const on = cat === c.id; return (
          <Pressable key={c.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { hap.tap(); setCat(c.id); }} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: on ? c.color : colors.card, borderWidth: 1, borderColor: on ? c.color : colors.line }}>
            <Text style={{ color: on ? '#000' : colors.fg, fontWeight: '800', fontSize: 13 }}>{c.label}</Text></Pressable>); })}
      </ScrollView>
      {filtering ? (
        shown.length ? (<View style={{ gap: 10 }}>
          {Array.from({ length: Math.ceil(shown.length / 2) }, (_, r) => (<View key={r} style={{ flexDirection: 'row', gap: 10 }}>{[shown[r * 2], shown[r * 2 + 1]].map((g, k) => (g ? <GameTile key={g.r} wide g={g} best={st.best[g.r]} resumable={st.resume.includes(g.r)} pinned={pins.includes(g.r)} onPin={() => toggle(g.r)} onOpen={() => navigation.navigate(g.r)} /> : <View key={k} style={{ flex: 1 }} />))}</View>))}
        </View>) : <Note>No game matches that. Try another word.</Note>
      ) : (<>
        <Reveal index={2}><DailyBanner navigation={navigation} st={st} /></Reveal>
        <Reveal index={2}><ChallengeCard navigation={navigation} /></Reveal>
        {st.resume.length ? <ContinueRow navigation={navigation} st={st} pins={pins} toggle={toggle} /> : null}
        {pins.length ? <PinnedRow navigation={navigation} st={st} pins={pins} toggle={toggle} /> : null}
        {CATS.map((c, i) => { const list = GAMES.filter((g) => g.c === c.id); return (
          <Reveal key={c.id} index={Math.min(i + 3, 8)}><View style={{ gap: 10 }}>
            <Head color={c.color} title={c.label} sub={`${c.blurb} · ${list.length}`} right={<Pressable accessibilityRole="button" hitSlop={8} onPress={() => setCat(c.id)}><Text style={{ color: c.color, fontWeight: '800', fontSize: 13 }}>See all</Text></Pressable>} />
            <Strip games={list} st={st} pins={pins} toggle={toggle} navigation={navigation} />
          </View></Reveal>); })}
        <Note>Tap the star on a game to pin it. Pinned games also show in the Fun menu.</Note>
      </>)}
    </Screen>);
}
