import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Note, ErrorNote } from '../components/Screen';
import Skeleton from '../components/Skeleton';
import Dropdown from '../components/Dropdown';
import { StatHeader, StatRow, StatList, SectionLabel } from '../components/StatRows';
import { useAsync } from '../hooks/useAsync';
import { numberBoard, sprintSeason, sprintAll } from '../api/jolpica';
import { localSeasons, lastTeamOf, careerStats, hasDriver } from '../api/history';
import { YEAR } from '../api/openf1';
import { colors, alpha, teamColor } from '../theme';

// ---------- Number history: which drivers have registered each career number ----------
export function NumberHistoryScreen() {
  const q = useAsync(() => numberBoard(), []); const [pick, setPick] = useState(null); const by = q.v || {};
  const info = (d) => { let yrs = null, team = null, c = null; try { if (hasDriver(d.id)) { const y = localSeasons(d.id) || []; if (y.length) yrs = [Math.min(...y), Math.max(...y)]; team = lastTeamOf(d.id); c = careerStats(d.id); } } catch {} return { yrs, team, c }; };
  const nums = Array.from({ length: 99 }, (_, i) => i + 1); const used = Object.keys(by).length;
  const now = (d) => { const i = info(d); return !!(i.yrs && i.yrs[1] >= YEAR - 1); };
  const col = (n) => { const l = by[n]; if (!l) return alpha(colors.fg, 0.07); return l.some(now) ? colors.good : alpha(colors.accent, 0.8); };
  const list = pick && by[pick] ? by[pick] : [];
  return (
    <Screen header={false}>
      <StatHeader title="Number history" icon="keypad" color={colors.purple} note="Since 2014 every driver picks a career number. Green numbers belong to a driver on the grid now, red ones were registered by a driver who has left and grey ones have never been taken. Tap a number to see who held it." />
      {q.loading ? <Skeleton rows={4} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {q.v ? (<>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{nums.map((n) => (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={`Number ${n}${by[n] ? `, ${by[n].map((d) => d.name).join(', ')}` : ', never taken'}`} onPress={() => setPick(pick === n ? null : n)} style={{ width: 40, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: col(n), borderWidth: pick === n ? 2 : 0, borderColor: colors.fg }}><Text style={{ color: by[n] ? '#fff' : colors.muted, fontWeight: '800', fontSize: 13 }}>{n}</Text></Pressable>))}</View>
        {(() => { const cur = nums.filter((n) => by[n] && by[n].some(now)); const gone = nums.filter((n) => by[n] && !by[n].some(now)); const multi = nums.filter((n) => by[n] && by[n].length > 1);
          return (<View style={{ flexDirection: 'row', gap: 10 }}>{[[cur.length, 'on the grid', colors.good], [gone.length, 'retired owners', colors.accent], [99 - used, 'still free', colors.muted], [multi.length, 'used twice+', colors.purple]].map(([v, l, c]) => (
            <View key={l} style={{ flex: 1, padding: 10, borderRadius: 14, backgroundColor: alpha(c, 0.14), borderWidth: 1, borderColor: alpha(c, 0.4), alignItems: 'center' }}><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '900' }}>{v}</Text><Text style={{ color: colors.onSoft, fontSize: 11, textAlign: 'center' }}>{l}</Text></View>))}</View>); })()}
        <Note>{`${used} of 99 numbers have been registered. ${99 - used} are still free.`}</Note>
        {pick ? (<>
          <SectionLabel color={colors.purple}>{`Number ${pick}`}</SectionLabel>
          {list.length ? <StatList>{list.map((d, i) => { const f = info(d); return (
            <StatRow key={d.id} i={i} badge={pick} title={d.name} sub={`${f.yrs ? `${f.yrs[0]}${f.yrs[0] === f.yrs[1] ? '' : ` to ${f.yrs[1]}`}` : 'Season list not in the offline history'}${f.team ? ` · ${f.team.team}` : ''}${d.nat ? ` · ${d.nat}` : ''}`} value={f.c ? `${f.c.wins} W` : ''} color={f.team ? teamColor(f.team.teamId) : colors.purple} />); })}</StatList>
            : <Card><Text style={{ color: colors.onSoft }}>Nobody has registered this number yet.</Text></Card>}
        </>) : null}
        <Note>Numbers come from the race data service. Before 2014 numbers belonged to teams, so older drivers are not listed. Seasons and wins come from the offline history up to 2025.</Note>
      </>) : null}
    </Screen>);
}

// ---------- Sprint weekend stats ----------
const SYEARS = Array.from({ length: YEAR - 2020 }, (_, i) => YEAR - i);
export function SprintStatsScreen() {
  const [year, setYear] = useState('all'); const q = useAsync(() => (year === 'all' ? sprintAll(2021, YEAR) : sprintSeason(Number(year))), [year]);
  const d = q.v; const ds = d ? [...d.drivers].sort((a, b) => b.wins - a.wins || b.pts - a.pts || b.podiums - a.podiums) : [];
  const both = d ? d.weekends.filter((w) => w.win && w.raceWin && w.win.id === w.raceWin.id).length : 0; const full = d ? d.weekends.filter((w) => w.win) : [];
  const winners = new Set(full.map((w) => w.win.id)).size;
  return (
    <Screen header={false}>
      <StatHeader title="Sprint weekends" icon="flash" color={colors.sprint} note="Sprint results since the format began in 2021: who wins them, who gains the most places and how often the sprint winner also wins the Grand Prix." />
      <Dropdown value={year} options={[['all', 'All sprints'], ...SYEARS.map((y) => [y, String(y)])]} onChange={(v) => setYear(v === 'all' ? 'all' : Number(v))} prefix="Season" />
      {q.loading ? <Skeleton rows={5} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {d && !full.length ? <Note>No sprint has been run in this selection yet.</Note> : null}
      {d && full.length ? (<>
        <View style={{ flexDirection: 'row', gap: 10 }}>{[[full.length, 'sprints', colors.sprint], [winners, 'different winners', colors.gold], [`${both}/${full.filter((w) => w.raceWin).length}`, 'won the GP too', colors.good]].map(([v, l, c]) => (<View key={l} style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: alpha(c, 0.14), borderWidth: 1, borderColor: alpha(c, 0.4) }}><Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.onSoft, fontSize: 12 }}>{l}</Text></View>))}</View>
        <SectionLabel color={colors.sprint}>Drivers</SectionLabel>
        <StatList>{ds.slice(0, 20).map((x, i) => (<StatRow key={x.id} i={i} medal badge={i + 1} title={x.name} sub={`${x.n} sprint${x.n === 1 ? '' : 's'} · ${x.podiums} podium${x.podiums === 1 ? '' : 's'} · ${x.gainN ? `${x.gain / x.gainN >= 0 ? '+' : ''}${(x.gain / x.gainN).toFixed(1)} places on average` : 'no grid data'}`} value={`${x.wins} W · ${x.pts} pts`} frac={ds[0].wins ? x.wins / ds[0].wins : undefined} color={teamColor(x.teamId)} />))}</StatList>
        <SectionLabel color={colors.sprint}>Weekends</SectionLabel>
        <StatList>{[...full].reverse().map((w, i) => (<StatRow key={`${w.year}-${w.round}`} i={i} badge={year === 'all' ? String(w.year).slice(2) : `R${w.round}`} title={w.name} sub={`Sprint: ${w.win.name}${w.raceWin ? ` · Grand Prix: ${w.raceWin.name}` : ''}`} value={w.raceWin && w.raceWin.id === w.win.id ? 'DOUBLE' : ''} color={colors.sprint} />))}</StatList>
        <Note>Points are the sprint points only. Places gained is the starting slot minus the finishing place. Loaded from Jolpica and kept on the phone.</Note>
      </>) : null}
    </Screen>);
}
