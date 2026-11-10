import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Dropdown from '../components/Dropdown';
import { Text } from '../components/Text';
import { Btn } from '../components/FunBits';
import LiveRace from '../components/LiveRace';
import { colors, teamColor } from '../theme';
import { historyYears, roundsOf, raceRowsOf } from '../api/history';
import { circuitFor } from '../data/circuits';

// Time machine: pick any past race and watch it lap by lap. The grid, finishing order and retirements are real; the lap-by-lap chart in between is reconstructed.
const hashN = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
export default function TimeMachineScreen() {
  const years = useMemo(() => historyYears(), []);
  const [year, setYear] = useState(years[1] || years[0]); const [round, setRound] = useState(1); const [live, setLive] = useState(null);
  const rounds = useMemo(() => roundsOf(year), [year]); const rc = rounds.find((x) => x.round === round) || rounds[0];
  const race = useMemo(() => (rc ? raceRowsOf(year, rc.round) : null), [year, rc?.round]);
  const start = () => {
    if (!race) return; const c = circuitFor({ circuit_short_name: race.name, location: race.name, country_name: race.country || '' });
    const lapKm = c?.stats?.find(([k]) => /lap length/i.test(k))?.[1]; const km = lapKm ? parseFloat(String(lapKm)) : 0;
    const laps = km > 2 ? Math.max(40, Math.min(78, Math.round(305 / km))) : 57; const winner = race.rows.find((r) => r.pos === 1);
    const drivers = race.rows.map((r) => {
      const ok = r.pos != null && (/^\d+$/.test(String(r.posText)) || /lap/i.test(r.status) || /finished/i.test(r.status)); const lapsDown = /\+(\d+) Lap/i.exec(r.status);
      const out = !ok; const lap = out ? 2 + (hashN(`${race.name}${year}${r.id}`) % Math.max(3, laps - 6)) : laps;
      const stops = ok ? (year < 1994 ? hashN(`${year}${r.id}s`) % 2 : 1 + (hashN(`${year}${r.id}s`) % 3)) : 0;
      const gap = ok && r.pos !== 1 ? Math.max(1, (r.pos - 1) * 4.5 + (hashN(`${year}${r.id}g`) % 40) / 10 + (lapsDown ? 70 * Number(lapsDown[1]) : 0)) : (r.pos === 1 ? 0 : null);
      return { id: r.id, name: r.name, code: r.code, photo: null, color: teamColor(r.teamId) || colors.muted, pos: r.pos || 99, grid: r.grid, stops, out, lap, reason: r.status, crash: /accident|collision|spun/i.test(r.status), gap, mine: false };
    });
    setLive({ drivers, laps, race: `${race.name} ${year}`, winner: winner?.full });
  };
  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>Time machine</Eyebrow>
        <View style={{ gap: 10, marginTop: 10 }}>
          <Dropdown value={year} options={years.map((y) => [y, String(y)])} onChange={(y) => { setYear(Number(y)); setRound(1); }} prefix="Season" />
          <Dropdown value={rc?.round} options={rounds.map((x) => [x.round, `R${x.round} · ${x.name}`])} onChange={(v) => setRound(Number(v))} prefix="Race" />
        </View>
        {race ? <Text style={{ color: colors.muted, fontSize: 14, marginTop: 10 }}>{`${race.rows.length} starters. Winner: ${race.rows.find((r) => r.pos === 1)?.full || 'unknown'}.`}</Text> : null}
        <View style={{ marginTop: 12 }}><Btn icon="play" onPress={start} disabled={!race}>Watch this race</Btn></View>
        <Note>The starting grid, finishing order and retirements are the real ones. The laps in between (when cars pit, when they fall out, the gaps) are reconstructed, because lap-by-lap history is not stored offline.</Note>
      </Card>
      <LiveRace visible={!!live} race={live?.race || ''} laps={live?.laps} drivers={live?.drivers} sc={false} wet={false} onClose={() => setLive(null)} />
    </Screen>);
}
