import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import Skeleton from '../components/Skeleton';
import ShareCard from '../components/ShareCard';
import { Segmented } from '../components/Shared';
import { useAsync } from '../hooks/useAsync';
import { colors, alpha, teamColor } from '../theme';
import { YEAR } from '../api/openf1';
import { driverStandings, driverSeasonResults } from '../api/jolpica';
import { localDriverInfo, teamEras } from '../api/history';
import { dominance } from '../lib/dominance';
import { successor, NOW_NAMES } from '../data/lineage';

const Row = ({ children, style }) => <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }, style]}>{children}</View>;

// ---------- Dominance ranking: every season in the history ----------
export function DominanceScreen() {
  const [tab, setTab] = useState('dom'); const all = useMemo(() => { try { return dominance(); } catch { return []; } }, []);
  const list = useMemo(() => { const a = [...all]; if (tab === 'dom') a.sort((x, y) => y.dom - x.dom); else if (tab === 'close') a.sort((x, y) => x.margin - y.margin); else a.sort((x, y) => y.teamRate - x.teamRate || y.dom - x.dom); return a.slice(0, 20); }, [all, tab]);
  const max = tab === 'dom' ? 100 : tab === 'team' ? 100 : 0.12;
  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>Dominance ranking</Eyebrow>
        <View style={{ marginTop: 10 }}><Segmented value={tab} onChange={setTab} items={[['dom', 'Most dominant'], ['close', 'Closest fights'], ['team', 'Best teams']]} /></View>
        <Note>{tab === 'dom' ? 'Dominance is the average of the champion\'s win rate and the champion team\'s win rate in that season.' : tab === 'close' ? 'Smallest points lead of the champion over second place, as a share of the champion\'s total. Totals follow the points system of the day.' : 'Share of the season\'s races won by the champion team.'}</Note>
      </Card>
      {!all.length ? <Note>No history available.</Note> : null}
      <ShareCard title="Most dominant F1 seasons"><Card>
        {list.map((x, i) => { const v = tab === 'dom' ? x.dom : tab === 'team' ? x.teamRate * 100 : x.margin; const label = tab === 'close' ? `${Math.round((x.champPts - x.secondPts) * 10) / 10} pts` : `${Math.round(v)}%`; return (
          <Row key={x.year} style={i === 0 ? { borderTopWidth: 0 } : null}>
            <Text style={{ width: 22, color: colors.muted, fontWeight: '800' }}>{i + 1}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 16 }}>{x.year}</Text><Text style={{ color: colors.fg, fontSize: 14, flex: 1 }} numberOfLines={1}>{`${x.driver} · ${x.team}`}</Text></View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: alpha(colors.muted, 0.15), overflow: 'hidden' }}><View style={{ width: `${Math.max(3, Math.min(100, tab === 'close' ? (1 - x.margin / max) * 100 : (v / max) * 100))}%`, height: 8, borderRadius: 4, backgroundColor: colors.accent }} /></View>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{tab === 'close' ? `Beat ${x.second} by ${Math.round((x.champPts - x.secondPts) * 10) / 10}, in ${x.races} races` : `${x.champWins} wins of ${x.races} for the champion, ${x.teamWins} for the team`}</Text>
            </View>
            <Text style={{ color: colors.fg, fontWeight: '800', fontSize: 16 }}>{label}</Text>
          </Row>); })}
      </Card></ShareCard>
    </Screen>);
}

// ---------- Team family trees ----------
const TODAY = ['mercedes', 'ferrari', 'red_bull', 'mclaren', 'aston_martin', 'alpine', 'williams', 'haas', 'rb', 'audi', 'cadillac'];
const rootOf = (id) => { let x = id, n = 0; while (successor[x] && n++ < 6) x = successor[x]; return x; };
export function TeamTreesScreen({ navigation }) {
  const fam = useMemo(() => {
    let eras = {}; try { eras = teamEras(); } catch {} const g = {};
    Object.values(eras).forEach((e) => { const r = rootOf(e.id); (g[r] = g[r] || []).push(e); });
    TODAY.forEach((k) => { if (!g[k]) g[k] = []; });
    const rows = Object.entries(g).map(([root, list]) => { list.sort((a, b) => a.first - b.first); const wins = list.reduce((a, e) => a + e.wins, 0), titles = list.reduce((a, e) => a + e.titles, 0); return { root, name: NOW_NAMES[root] || list.find((e) => e.id === root)?.name || list[list.length - 1]?.name || root, list, wins, titles, today: TODAY.includes(root), first: list[0]?.first, last: list[list.length - 1]?.last }; });
    return rows;
  }, []);
  const today = fam.filter((f) => f.today && f.list.length).sort((a, b) => b.wins - a.wins), gone = fam.filter((f) => !f.today && f.list.length).sort((a, b) => b.wins - a.wins || b.titles - a.titles).slice(0, 25);
  const Fam = ({ f }) => (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 5, height: 24, borderRadius: 2, backgroundColor: teamColor(f.root) }} /><Text style={{ flex: 1, color: colors.fg, fontWeight: '800', fontSize: 18 }} numberOfLines={1}>{f.name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{`${f.wins} wins${f.titles ? ` · ${f.titles} titles` : ''}`}</Text></View>
      <View style={{ marginTop: 8 }}>{f.list.map((e, i) => (
        <Pressable key={e.id} accessibilityRole="button" onPress={() => navigation.navigate('Team', { teamId: e.id, name: e.name })} style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ alignItems: 'center', width: 14 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: teamColor(e.id), marginTop: 6 }} />{i < f.list.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: colors.line }} /> : null}</View>
          <View style={{ flex: 1, paddingBottom: 10 }}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 15 }}>{e.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{`${e.first}${e.last !== e.first ? ` to ${e.last}` : ''} · ${e.starts} starts · ${e.wins} win${e.wins === 1 ? '' : 's'}${e.titles ? ` · ${e.titles} title${e.titles > 1 ? 's' : ''}` : ''}`}</Text></View>
        </Pressable>))}
        {!f.list.length ? <Text style={{ color: colors.muted }}>New entry, no history yet.</Text> : null}</View>
    </Card>);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Team family trees</Eyebrow><Note>Each team on today's grid with the names it raced under before. Renames and takeovers follow the app's lineage list (for example Minardi to Toro Rosso to AlphaTauri to Racing Bulls). Tap an era to open that team.</Note></Card>
      <Eyebrow>On the grid today</Eyebrow>
      {today.map((f) => <Fam key={f.root} f={f} />)}
      <Eyebrow>Gone from the grid</Eyebrow>
      {gone.map((f) => <Fam key={f.root} f={f} />)}
      <Note>Showing the 25 defunct teams with the most wins.</Note>
    </Screen>);
}

// ---------- Rookie report ----------
async function rookieData() {
  const st = await driverStandings(YEAR); const rows = st || []; const rookies = rows.filter((r) => { try { return !localDriverInfo(r.driverId); } catch { return false; } });
  const out = [];
  for (const r of rookies) {
    const mates = rows.filter((x) => x.teamId === r.teamId && x.driverId !== r.driverId); const mate = mates.find((m) => { try { return !!localDriverInfo(m.driverId); } catch { return true; } }) || mates[0] || null;
    const [mine, theirs] = await Promise.all([driverSeasonResults(YEAR, r.driverId).catch(() => []), mate ? driverSeasonResults(YEAR, mate.driverId).catch(() => []) : Promise.resolve([])]);
    const fin = (x) => (x.positionText && /^\d+$/.test(String(x.positionText)) ? x.position : 99); const ok = (x) => /^(Finished|\+\d+ Laps?)$/i.test(x.status || '');
    let ahead = 0, behind = 0; mine.forEach((x) => { const y = theirs.find((z) => z.round === x.round); if (!y) return; const a = ok(x) ? fin(x) : 99, b = ok(y) ? fin(y) : 99; if (a < b) ahead++; else if (b < a) behind++; });
    const ps = mine.filter((x) => ok(x)).map(fin).filter((p) => p < 99);
    out.push({ ...r, mate, starts: mine.length, pts: mine.reduce((a, x) => a + x.points, 0), best: ps.length ? Math.min(...ps) : null, avg: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null, dnf: mine.filter((x) => !ok(x)).length, matePts: theirs.reduce((a, x) => a + x.points, 0), mateStarts: theirs.length, ahead, behind });
  }
  return out;
}
export function RookieScreen({ navigation }) {
  const q = useAsync(rookieData, []);
  return (
    <Screen header={false}>
      <Card><Eyebrow>{`Rookie report ${YEAR}`}</Eyebrow><Note>Drivers in their first season, measured against the team-mate. A rookie is a driver with no race in the history before this season.</Note></Card>
      {q.loading ? <Skeleton rows={4} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {q.v && !q.v.length ? <Note>No first-year drivers on this season's grid, or the season has no results yet.</Note> : null}
      {(q.v || []).map((r) => (
        <Pressable key={r.driverId} accessibilityRole="button" onPress={() => navigation.navigate('Driver', { driverId: r.driverId, name: r.name || `${r.first} ${r.last}`, first: r.first, last: r.last, teamId: r.teamId, team: r.team })}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 5, height: 28, borderRadius: 2, backgroundColor: teamColor(r.teamId) }} /><View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 18 }} numberOfLines={1}>{`${r.first} ${r.last}`}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{r.team}</Text></View><Text style={{ color: colors.gold, fontWeight: '800', fontSize: 16 }}>{`P${r.position}`}</Text></View>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>{[['POINTS', r.pts], ['PER RACE', r.starts ? (r.pts / r.starts).toFixed(1) : '-'], ['BEST', r.best ? `P${r.best}` : '-'], ['AVG', r.avg ? r.avg.toFixed(1) : '-'], ['DNF', r.dnf]].map(([k, v]) => (<View key={k} style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }}>{String(v)}</Text><Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1 }}>{k}</Text></View>))}</View>
            {r.mate ? <Text style={{ color: colors.fg, fontSize: 14, marginTop: 10 }}>{`Against ${r.mate.first} ${r.mate.last}: ahead in ${r.ahead} of ${r.ahead + r.behind} shared races, ${r.pts} to ${r.matePts} points.`}</Text> : <Text style={{ color: colors.muted, marginTop: 10 }}>No team-mate to compare with.</Text>}
          </Card>
        </Pressable>))}
    </Screen>);
}
