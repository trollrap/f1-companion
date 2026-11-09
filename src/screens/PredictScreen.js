import React, { useMemo, useRef, useState } from 'react';
import { View, Share } from 'react-native';
import ExportBar from '../components/ExportBar';
import PredictCard from '../components/PredictCard';
import { useTeamColor } from '../hooks/useTeams';
import { flag as flagOf } from '../lib/time';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Dropdown from '../components/Dropdown';
import { useAsync } from '../hooks/useAsync';
import { useSeason, useNow } from '../hooks/useSeason';
import { driverStandings, sessionResults } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { usePredictions, score, bonusFor, DOUBLES } from '../lib/predictions';
import { Switch } from 'react-native';
import { shortName } from '../lib/time';
import { Pressable } from 'react-native';
import { colors } from '../theme';
import { useNavigation } from '@react-navigation/native';

const NONE = '';
const startOf = (sessions, name) => { const s = sessions?.find((x) => x.session_name === name); return s ? Date.parse(s.date_start) : null; };
// Pick pole and podium for the next race, then see how many points the real result earns.
export default function PredictScreen() {
  const nav = useNavigation(); const season = useSeason(); const now = useNow(30000); const P = usePredictions();
  const d = useAsync(() => driverStandings(YEAR), []);
  const next = season.next, round = next ? Number(next.round) : null, mine = (round && P.all[round]) || { pole: NONE, podium: [NONE, NONE, NONE] };
  const poleLock = startOf(season.sessions, 'Qualifying'), raceLock = startOf(season.sessions, 'Race');
  const poleLocked = poleLock != null && now >= poleLock, raceLocked = raceLock != null && now >= raceLock;
  const opts = [[NONE, 'Choose a driver'], ...(d.v || []).map((x) => [x.driverId, `${x.first} ${x.last}`])];
  const name = (id) => { const x = d.v?.find((y) => y.driverId === id); return x ? x.last : '—'; };
  const setPole = (id) => P.set(round, { ...mine, pole: id });
  const setSlot = (i, id) => { const podium = mine.podium.map((x, k) => (k === i ? id : x === id && id ? NONE : x)); P.set(round, { ...mine, podium }); };
  // earlier rounds with a saved prediction, newest first
  const past = useMemo(() => Object.keys(P.all).map(Number).filter((r) => r !== round).sort((a, b) => b - a), [P.all, round]);
  const res = useAsync(async () => {
    const out = {};
    for (const r of past) { const [q, rc] = await Promise.all([sessionResults(YEAR, r, 'qualifying').catch(() => null), sessionResults(YEAR, r, 'results').catch(() => null)]); out[r] = { q, rc }; }
    return out;
  }, [past.join(',')]);
  const results = past.map((r) => ({ r, pred: P.all[r], sc: res.v ? score(P.all[r], res.v[r]?.q, res.v[r]?.rc, r) : null, gp: season.races?.find((x) => Number(x.round) === r) })).filter((x) => x.sc);
  const total = results.reduce((a, x) => a + x.sc.total, 0);
  const tc = useTeamColor(); const cardRef = useRef(null); const pastRef = useRef(null);
  const pick = (id) => { const x = d.v?.find((y) => y.driverId === id); return x ? { driverId: x.driverId, first: x.first, last: x.last, teamId: x.teamId, team: x.team, color: tc(x.teamId) } : null; };
  const [open, setOpen] = useState(null);
  const shareText = () => Share.share({ message: `My ${shortName(next.meeting_name)} GP picks\nPole: ${name(mine.pole)}\nP1: ${name(mine.podium[0])}\nP2: ${name(mine.podium[1])}\nP3: ${name(mine.podium[2])}` }).catch(() => {});
  return (
    <Screen header={false}>
      <Pressable onPress={() => nav.navigate('Leaderboard')} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-end', paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)' }, pressed && { opacity: 0.6 }]}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 14 }}>Leaderboard · friends</Text></Pressable>
      {next ? (
        <Card>
          <Eyebrow>{`Predict · ${shortName(next.meeting_name)}`}</Eyebrow>
          <Note>Pole counts 2 points. Each podium pick counts 3 when exactly right and 1 when the driver is on the podium in another place. Best possible: 11. Picks lock when qualifying (pole) and the race (podium) start.</Note>
          {d.loading && <Skeleton rows={2} />}
          {d.v && (
            <View style={{ gap: 10, marginTop: 12 }}>
              <View><Text style={s.lab}>{poleLocked ? 'Pole (locked)' : 'Pole position'}</Text>{poleLocked ? <Text style={s.val}>{name(mine.pole)}</Text> : <Dropdown value={mine.pole} options={opts} onChange={setPole} />}</View>
              {[0, 1, 2].map((i) => (<View key={i}><Text style={s.lab}>{raceLocked ? `P${i + 1} (locked)` : `Podium P${i + 1}`}</Text>{raceLocked ? <Text style={s.val}>{name(mine.podium[i])}</Text> : <Dropdown value={mine.podium[i]} options={opts} onChange={(id) => setSlot(i, id)} />}</View>))}
              <View style={{ gap: 8, marginTop: 4, padding: 12, borderRadius: 14, backgroundColor: colors.surface2 }}>
                <Text style={s.lab}>POWER-UPS</Text>
                {(() => { const used = Object.keys(P.all).filter((r) => Number(r) !== round && P.all[r]?.x2).length; const left = DOUBLES - used; return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}><Text style={s.val}>Double down</Text><Text style={s.sub}>{`Doubles all your points for this race. ${left} of ${DOUBLES} left this season.`}</Text></View>
                    <Switch value={!!mine.x2} disabled={raceLocked || (left <= 0 && !mine.x2)} onValueChange={(v) => P.set(round, { ...mine, x2: v })} trackColor={{ true: colors.accent }} />
                  </View>); })()}
                <View><Text style={s.val}>{`Bonus question (+2): ${bonusFor(round).q}`}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>{[['y', 'Yes'], ['n', 'No']].map(([k, l]) => (
                    <Pressable key={k} disabled={raceLocked} onPress={() => P.set(round, { ...mine, bonus: mine.bonus === k ? null : k })} style={({ pressed }) => [{ flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: mine.bonus === k ? colors.accent : colors.line, backgroundColor: mine.bonus === k ? colors.accentSoft : 'transparent', opacity: raceLocked ? 0.5 : 1 }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }}>{l}</Text></Pressable>))}</View>
                </View>
              </View>
              <View ref={cardRef} collapsable={false}><PredictCard gp={shortName(next.meeting_name)} flag={flagOf(next.country_code)} pole={pick(mine.pole)} podium={mine.podium.map(pick)} /></View>
              <ExportBar target={cardRef} fallback={shareText} />
            </View>)}
        </Card>) : <Card><Note>The season is over: no race left to predict.</Note></Card>}
      <Card>
        <Eyebrow>{`Your score · ${YEAR}`}</Eyebrow>
        <Text style={{ color: colors.fg, fontSize: 34, fontWeight: '800', marginTop: 8 }}>{total} pts</Text>
        {res.loading && past.length > 0 && <Skeleton rows={2} />}
        {!past.length && <Note>Your finished predictions show up here with the points they earned.</Note>}
        {results.map(({ r, pred, sc, gp }) => (
          <View key={r} style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={s.val}>{gp ? shortName(gp.meeting_name) : `Round ${r}`}</Text><Text style={{ color: colors.accent, fontWeight: '800', fontSize: 18 }}>{sc.total} pts</Text></View>
            <Text style={s.sub}>{`Pole ${name(pred.pole)}${sc.pole != null ? ` (+${sc.pole})` : ' (waiting)'}${sc.bonus != null ? ` · Bonus +${sc.bonus}` : ''}${sc.double ? ' · Doubled' : ''}`}</Text>
            <Pressable onPress={() => setOpen(open === r ? null : r)} hitSlop={8} style={{ marginTop: 8, alignSelf: 'flex-start' }}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>{open === r ? 'Hide picture' : 'Picture to share or save'}</Text></Pressable>
            {open === r && (
              <View style={{ marginTop: 10, gap: 10 }}>
                <View ref={pastRef} collapsable={false}><PredictCard gp={gp ? shortName(gp.meeting_name) : `Round ${r}`} flag={gp ? flagOf(gp.country_code) : ''} pole={pick(pred.pole)} podium={(pred.podium || []).map(pick)} marks={{ pole: sc.pole == null ? null : sc.pole > 0, podium: [0, 1, 2].map((i) => (sc.podium[i] == null ? null : sc.podium[i] === 3)) }} /></View>
                <ExportBar target={pastRef} />
              </View>)}
            <Text style={s.sub}>{[0, 1, 2].map((i) => `P${i + 1} ${name(pred.podium?.[i])}${sc.podium[i] != null ? ` (+${sc.podium[i]})` : ''}`).join(' · ')}</Text>
          </View>))}
      </Card>
    </Screen>
  );
}
const s = { lab: { color: colors.muted, fontSize: 13, marginBottom: 6, letterSpacing: 0.4 }, val: { color: colors.fg, fontSize: 18, fontWeight: '700' }, sub: { color: colors.muted, fontSize: 15, marginTop: 4 } };
