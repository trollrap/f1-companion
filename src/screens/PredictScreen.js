import React, { useMemo, useRef, useState } from 'react';
import { View, Share } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
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
import { usePredictions, score } from '../lib/predictions';
import { shortName } from '../lib/time';
import { Pressable } from 'react-native';
import { colors } from '../theme';

const NONE = '';
const startOf = (sessions, name) => { const s = sessions?.find((x) => x.session_name === name); return s ? Date.parse(s.date_start) : null; };
// Pick pole and podium for the next race, then see how many points the real result earns.
export default function PredictScreen() {
  const season = useSeason(); const now = useNow(30000); const P = usePredictions();
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
  const results = past.map((r) => ({ r, pred: P.all[r], sc: res.v ? score(P.all[r], res.v[r]?.q, res.v[r]?.rc) : null, gp: season.races?.find((x) => Number(x.round) === r) })).filter((x) => x.sc);
  const total = results.reduce((a, x) => a + x.sc.total, 0);
  const tc = useTeamColor(); const cardRef = useRef(null); const [busy, setBusy] = useState(false);
  const pick = (id) => { const x = d.v?.find((y) => y.driverId === id); return x ? { driverId: x.driverId, last: x.last, color: tc(x.teamId) } : null; };
  // Shares the card as a picture when the image modules are in this build; otherwise as plain text.
  const share = async () => {
    setBusy(true);
    try {
      if (requireOptionalNativeModule('RNViewShot') && requireOptionalNativeModule('ExpoSharing')) {
        const { captureRef } = require('react-native-view-shot'); const Sharing = require('expo-sharing');
        const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
        if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share my predictions' }); return; }
      }
    } catch {} finally { setBusy(false); }
    shareText();
  };
  const shareText = () => Share.share({ message: `My ${shortName(next.meeting_name)} GP picks\nPole: ${name(mine.pole)}\nP1: ${name(mine.podium[0])}\nP2: ${name(mine.podium[1])}\nP3: ${name(mine.podium[2])}` }).catch(() => {});
  return (
    <Screen header={false}>
      {next ? (
        <Card>
          <Eyebrow>{`Predict · ${shortName(next.meeting_name)}`}</Eyebrow>
          <Note>Pole counts 2 points. Each podium pick counts 3 when exactly right and 1 when the driver is on the podium in another place. Best possible: 11. Picks lock when qualifying (pole) and the race (podium) start.</Note>
          {d.loading && <Skeleton rows={2} />}
          {d.v && (
            <View style={{ gap: 10, marginTop: 12 }}>
              <View><Text style={s.lab}>{poleLocked ? 'Pole (locked)' : 'Pole position'}</Text>{poleLocked ? <Text style={s.val}>{name(mine.pole)}</Text> : <Dropdown value={mine.pole} options={opts} onChange={setPole} />}</View>
              {[0, 1, 2].map((i) => (<View key={i}><Text style={s.lab}>{raceLocked ? `P${i + 1} (locked)` : `Podium P${i + 1}`}</Text>{raceLocked ? <Text style={s.val}>{name(mine.podium[i])}</Text> : <Dropdown value={mine.podium[i]} options={opts} onChange={(id) => setSlot(i, id)} />}</View>))}
              <View ref={cardRef} collapsable={false} style={{ marginTop: 4 }}><PredictCard gp={shortName(next.meeting_name)} flag={flagOf(next.country_code)} pole={pick(mine.pole)} podium={mine.podium.map(pick)} /></View>
              <Pressable onPress={share} disabled={busy} style={({ pressed }) => [{ height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent }, pressed && { opacity: 0.85 }]}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 16 }}>Share my picks</Text></Pressable>
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
            <Text style={s.sub}>{`Pole ${name(pred.pole)}${sc.pole != null ? ` (+${sc.pole})` : ' (waiting)'}`}</Text>
            <Text style={s.sub}>{[0, 1, 2].map((i) => `P${i + 1} ${name(pred.podium?.[i])}${sc.podium[i] != null ? ` (+${sc.podium[i]})` : ''}`).join(' · ')}</Text>
          </View>))}
      </Card>
    </Screen>
  );
}
const s = { lab: { color: colors.muted, fontSize: 13, marginBottom: 6, letterSpacing: 0.4 }, val: { color: colors.fg, fontSize: 18, fontWeight: '700' }, sub: { color: colors.muted, fontSize: 15, marginTop: 4 } };
