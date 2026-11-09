import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Skeleton from '../components/Skeleton';
import { Btn } from '../components/FunBits';
import { Bar } from '../components/Anim';
import { colors, alpha } from '../theme';
import { useSeason } from '../hooks/useSeason';
import { useAsync } from '../hooks/useAsync';
import { sessionResults } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { dailyQuiz } from '../lib/trivia';

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
const load = async (k, d) => { try { const r = await AsyncStorage.getItem(k); return r ? JSON.parse(r) : d; } catch { return d; } };
const save = (k, v) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

// Fan zone: a daily five-question quiz with a streak, and a driver-of-the-day vote for the latest race (kept on this phone).
export default function FanZoneScreen() {
  const today = dayKey(); const qs = useMemo(() => dailyQuiz(today, 5), [today]);
  const [st, setSt] = useState(null); const [i, setI] = useState(0); const [pick, setPick] = useState(null); const [pts, setPts] = useState(0);
  const [votes, setVotes] = useState({}); const season = useSeason();
  useEffect(() => { load('fanDaily', { streak: 0, best: 0, last: null, scores: {} }).then(setSt); load('fanDotd', {}).then(setVotes); }, []);
  const done = st && st.last === today && st.scores[today] != null; const q = qs[i];
  const answer = (o) => { if (pick != null || !q) return; setPick(o); const np = pts + (o === q.a ? 1 : 0); setPts(np);
    setTimeout(() => { if (i + 1 < qs.length) { setI(i + 1); setPick(null); } else { const streak = st.last === yesterday() ? st.streak + 1 : 1; const n = { streak, best: Math.max(st.best, streak), last: today, scores: { ...st.scores, [today]: np } }; setSt(n); save('fanDaily', n); setPick(null); } }, 900); };
  // driver of the day
  const doneRaces = (season.races || []).filter((r) => Date.parse(r.date_end) < Date.now()); const last = doneRaces[doneRaces.length - 1]; const round = last ? Number(last.round) : null;
  const res = useAsync(() => (round ? sessionResults(YEAR, round, 'results').catch(() => null) : Promise.resolve(null)), [round]);
  const top = (res.v || []).slice(0, 10); const mine = round != null ? votes[round] : null;
  const vote = (r) => { const n = { ...votes, [round]: { id: r.driverId, name: `${r.first || ''} ${r.last || r.name || ''}`.trim(), race: last.meeting_name || '' } }; setVotes(n); save('fanDotd', n); };
  if (!st) return <Screen header={false}><Skeleton rows={4} /></Screen>;
  return (
    <Screen header={false}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="flame" size={30} color={st.streak ? colors.gold : colors.muted} />
          <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800' }}>{`${st.last === today || st.last === yesterday() ? st.streak : 0} day streak`}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{`Best: ${st.best} days`}</Text></View>
        </View>
      </Card>
      {done ? (
        <Card>
          <Eyebrow>Today's quiz</Eyebrow>
          <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800', marginTop: 6 }}>{`${st.scores[today]} / ${qs.length} correct`}</Text>
          <Note>Come back tomorrow for five new questions and to keep your streak.</Note>
          <Btn icon="share-social" onPress={() => Share.share({ message: `F1 daily quiz ${today}: ${st.scores[today]}/${qs.length}, ${st.streak} day streak.` }).catch(() => {})}>Share my score</Btn>
        </Card>
      ) : q ? (
        <View style={{ gap: 12 }}>
          <Card>
            <Eyebrow>{`Today's quiz · question ${i + 1} of ${qs.length}`}</Eyebrow>
            <View style={{ marginTop: 8 }}><Bar pct={(i / qs.length) * 100} height={6} /></View>
            <Text style={{ color: colors.fg, fontSize: 21, fontWeight: '700', lineHeight: 27, marginTop: 12 }}>{q.q}</Text>
          </Card>
          {q.opts.map((o, k) => { const right = o === q.a, chosen = pick === o, show = pick != null; const c = show ? (right ? colors.good : chosen ? colors.red : colors.line) : colors.line;
            return (<Pressable key={o + k} onPress={() => answer(o)} style={({ pressed }) => [{ padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: c, backgroundColor: show && (right || chosen) ? alpha(c, 0.18) : colors.surface }, pressed && { opacity: 0.8 }]}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '600' }}>{o}</Text></Pressable>); })}
        </View>
      ) : null}
      <Card>
        <Eyebrow>Driver of the day</Eyebrow>
        {!last ? <Note>The vote opens after the first race of the season.</Note> : res.loading ? <Skeleton rows={3} /> : !top.length ? <Note>Results are not available yet.</Note> : (
          <View style={{ marginTop: 6 }}>
            <Text style={{ color: colors.muted, fontSize: 15, marginBottom: 6 }}>{`${last.meeting_name}: who impressed you most?`}</Text>
            {top.map((r) => { const on = mine?.id === r.driverId; return (
              <Pressable key={r.driverId} onPress={() => vote(r)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: on ? alpha(colors.accent, 0.18) : 'transparent' }, pressed && { opacity: 0.7 }]}>
                <Text style={{ width: 26, color: colors.muted, fontWeight: '700' }}>{r.position}</Text>
                <Text style={{ flex: 1, color: colors.fg, fontSize: 18, fontWeight: on ? '800' : '600' }}>{`${r.first || ''} ${r.last || r.name || ''}`}</Text>
                {on ? <Ionicons name="checkmark-circle" size={22} color={colors.accent} /> : null}
              </Pressable>); })}
            <Note>Your vote stays on this phone. Tap another driver to change it.</Note>
          </View>)}
      </Card>
      {Object.keys(votes).length ? (
        <Card>
          <Eyebrow>Your driver-of-the-day history</Eyebrow>
          {Object.keys(votes).sort((a, b) => b - a).map((rd) => <View key={rd} style={{ flexDirection: 'row', gap: 10, paddingVertical: 5 }}><Text style={{ width: 40, color: colors.muted }}>{`R${rd}`}</Text><Text style={{ flex: 1, color: colors.fg, fontSize: 17, fontWeight: '600' }}>{votes[rd].name}</Text></View>)}
        </Card>) : null}
    </Screen>
  );
}
