import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Note } from '../components/Screen';
import Press from '../components/Press';
import Grad from '../components/Grad';
import { StatHeader, StatRow, StatList, SectionLabel } from '../components/StatRows';
import { colors, alpha } from '../theme';
import { catOf } from '../lib/gameCatalog';
import { loadChallenges } from '../lib/challenges';
import { useGameStatus } from './GamesHub';
import { runs } from './GameStats';

// Consecutive days (ending today or yesterday) on which all three challenges were finished.
export const challengeStreak = (days) => runs(days).now;
export function useChallenges() {
  const [c, setC] = useState(null);
  useFocusEffect(useCallback(() => { let off = false; loadChallenges().then((x) => { if (!off) setC(x); }).catch(() => {}); return () => { off = true; }; }, []));
  return c;
}
// Compact card for the Fun menu and the Games hub.
export function ChallengeCard({ navigation }) {
  const c = useChallenges(); if (!c) return null; const col = colors.good; const left = 3 - c.doneCount;
  return (
    <Press onPress={() => navigation.navigate('DailyChallenges')} scale={0.98} accessibilityLabel={`Daily challenges, ${c.doneCount} of 3 done`}>
      <Grad color={col} from={0.3} to={0.05} border={0.45} radius={18} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 5 }}>{c.list.map((x) => <View key={x.g.r} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: x.done ? col : alpha(colors.fg, 0.18) }} />)}</View>
        <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800' }}>Daily challenges</Text><Text style={{ color: colors.onSoft, fontSize: 13 }}>{left ? `${left} to go today. Play the three picked games.` : 'All done today. Come back tomorrow.'}</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Grad>
    </Press>);
}
export function DailyChallengesScreen({ navigation }) {
  const c = useChallenges(); const cur = c ? challengeStreak(c.days) : 0;
  return (
    <Screen header={false}>
      <StatHeader title="Daily challenges" icon="checkmark-done" color={colors.good} note="Three games are picked every day, the same for everyone. Play a move in each one to tick it off. Finish all three to extend your challenge streak." />
      {c ? (<>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[[c.doneCount + '/3', 'done today', colors.good], [cur, 'day streak', colors.gold], [c.days.length, 'perfect days', colors.purple]].map(([v, l, col]) => (<View key={l} style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: alpha(col, 0.14), borderWidth: 1, borderColor: alpha(col, 0.4) }}><Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.onSoft, fontSize: 12 }}>{l}</Text></View>))}
        </View>
        <SectionLabel color={colors.good}>Today</SectionLabel>
        <StatList>{c.list.map(({ g, done }, i) => (
          <Press key={g.r} onPress={() => navigation.navigate(g.r)}><StatRow i={i} badge={done ? '✓' : String(i + 1)} title={g.n} sub={done ? 'Done' : `${g.s}. Tap to play`} value={done ? 'DONE' : 'PLAY'} color={done ? colors.good : catOf(g.c).color} /></Press>))}</StatList>
        <Note>The picks change at midnight. A challenge counts when the game saves a move or a score today.</Note>
      </>) : <Note>Loading…</Note>}
    </Screen>);
}

// ---- Achievements ----
const TIERS = (id, title, icon, color, unit, goals, get) => goals.map((n, i) => ({ id: `${id}${n}`, title: `${title} ${['I', 'II', 'III', 'IV'][i]}`, desc: `${n} ${unit}`, icon, color, goal: n, get }));
export const ACHIEVEMENTS = [
  ...TIERS('days', 'Regular', 'calendar', '#4da3ff', 'days played', [1, 7, 30, 100], (s) => s.days),
  ...TIERS('streak', 'On a roll', 'flame', '#ff8c42', 'days in a row', [3, 7, 14, 30], (s) => s.streak),
  ...TIERS('bests', 'Collector', 'trophy', '#e8a33d', 'games with a best score', [3, 8, 15, 25], (s) => s.bests),
  ...TIERS('chal', 'Challenger', 'checkmark-done', '#3fcf8e', 'perfect challenge days', [1, 5, 15, 30], (s) => s.chal),
  { id: 'c4', title: 'Four in a row', desc: 'Beat the computer at Connect four 3 times', icon: 'ellipse', color: '#3fcf8e', goal: 3, get: (s) => s.best.ConnectFour || 0 },
  { id: 'bj', title: 'High roller', desc: 'Reach 2500 chips in Blackjack 21', icon: 'albums', color: '#9b6bff', goal: 2500, get: (s) => s.best.Blackjack || 0 },
  { id: 'snake', title: 'Long trail', desc: 'Score 25 in Snake (DRS trail)', icon: 'git-branch', color: '#2bc4c4', goal: 25, get: (s) => s.best.Snake || 0 },
  { id: 'chk', title: 'King me', desc: 'Win a game of Checkers', icon: 'ribbon', color: '#ff4d4d', goal: 1, get: (s) => s.best.Checkers || 0 },
];
export function AchievementsScreen() {
  const st = useGameStatus(); const c = useChallenges();
  const stats = { days: new Set(st.days).size, streak: runs(st.days).best, bests: Object.keys(st.best).length, chal: c ? c.days.length : 0, best: st.best };
  const list = ACHIEVEMENTS.map((a) => { const v = Math.min(a.get(stats), a.goal); return { ...a, v, done: v >= a.goal }; });
  const got = list.filter((a) => a.done).length;
  return (
    <Screen header={false}>
      <StatHeader title="Achievements" icon="ribbon" color={colors.gold} note={`${got} of ${list.length} unlocked. They are earned by playing: nothing to buy, nothing to claim.`} />
      <StatList>{[...list].sort((a, b) => (b.done - a.done) || (b.v / b.goal - a.v / a.goal)).map((a, i) => (
        <StatRow key={a.id} i={i} badge={a.done ? '★' : <Ionicons name={a.icon} size={16} color={a.color} />} title={a.title} sub={a.desc} value={a.done ? 'UNLOCKED' : `${a.v}/${a.goal}`} frac={a.v / a.goal} color={a.done ? colors.gold : a.color} />))}</StatList>
    </Screen>);
}
