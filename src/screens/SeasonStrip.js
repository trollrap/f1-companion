import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note, ErrorNote } from '../components/Screen';
import Skeleton from '../components/Skeleton';
import Reveal from '../components/Reveal';
import { Segmented } from '../components/Shared';
import { useAsync } from '../hooks/useAsync';
import { seasonPoints, winnersByRound, jolpicaSchedule } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { colors, alpha, teamColor } from '../theme';

// Every round of a season as a strip: who won, how the lead changed, how many rounds are left.
export default function SeasonStripScreen() {
  const [year, setYear] = useState(YEAR); const [sel, setSel] = useState(null);
  const q = useAsync(async () => { const [sp, win, sch] = await Promise.all([seasonPoints(year), winnersByRound(year).catch(() => ({})), jolpicaSchedule(year).catch(() => [])]); return { sp, win, sch }; }, [year]);
  const D = q.v;
  const info = useMemo(() => {
    if (!D || !D.sp || !D.sp.rounds.length) return null; const { sp, win, sch } = D; const total = Math.max(sch.length, sp.rounds.length);
    const leader = sp.rounds.map((r, k) => { let best = null; sp.drivers.forEach((d) => { if (!best || d.pts[k] > best.pts[k]) best = d; }); return best; });
    const runs = []; leader.forEach((d, k) => { const nm = d ? `${d.first} ${d.last}` : '-'; const last = runs[runs.length - 1]; if (last && last.name === nm) last.to = sp.rounds[k].round; else runs.push({ name: nm, from: sp.rounds[k].round, to: sp.rounds[k].round }); });
    const winners = new Set(Object.values(win).map((w) => w.last)); const top = sp.drivers.slice(0, 2); const k = sp.rounds.length - 1;
    return { total, done: sp.rounds.length, rounds: sch.length ? sch.map((r) => r.round) : sp.rounds.map((r) => r.round), names: Object.fromEntries((sch.length ? sch.map((r) => [r.round, r.raceName]) : sp.rounds.map((r) => [r.round, r.name]))), win, runs, changes: runs.length - 1, nWin: winners.size, gap: top.length > 1 ? top[0].pts[k] - top[1].pts[k] : null, lead: top[0] ? `${top[0].first} ${top[0].last}` : '' };
  }, [D]);
  return (
    <Screen header={false}>
      <Card><Eyebrow>Season progress</Eyebrow><Note>Every round of the season as a strip. Filled means done, coloured by the winner's team. Tap a round for its name and winner.</Note></Card>
      <Segmented value={year} items={[[YEAR, String(YEAR)], [YEAR - 1, String(YEAR - 1)], [YEAR - 2, String(YEAR - 2)], [YEAR - 3, String(YEAR - 3)]]} onChange={(v) => { setYear(v); setSel(null); }} />
      {q.loading ? <Skeleton rows={4} /> : null}
      {q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : null}
      {D && !info ? <Note>No races have been run in this season yet.</Note> : null}
      {info ? (<>
        <Card>
          <View style={{ flexDirection: 'row' }}>
            {[[`${info.done}/${info.total}`, 'Rounds done'], [info.total - info.done, 'To go'], [info.nWin, 'Different winners'], [info.changes, 'Lead changes']].map(([v, l]) => (<View key={l} style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>{v}</Text><Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>{l}</Text></View>))}
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 12, overflow: 'hidden' }}><View style={{ width: `${(info.done / info.total) * 100}%`, height: 6, backgroundColor: colors.accent }} /></View>
          {info.gap != null ? <Text style={{ color: colors.fg, marginTop: 8 }}>{`${info.lead} leads by ${info.gap} point${info.gap === 1 ? '' : 's'} after round ${info.done}.`}</Text> : null}
        </Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {info.rounds.map((r, i) => { const w = info.win[r]; const on = !!w; const c = on ? teamColor(w.teamId) : colors.line;
            return (<Reveal key={r} index={Math.min(i, 10)}><Pressable accessibilityRole="button" accessibilityLabel={`Round ${r}, ${info.names[r] || ''}${w ? `, won by ${w.last}` : ', not run yet'}`} onPress={() => setSel(r)} style={{ width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? alpha(c, 0.35) : 'transparent', borderWidth: sel === r ? 2 : 1, borderColor: sel === r ? colors.fg : on ? c : colors.line }}><Text style={{ color: colors.muted, fontSize: 10 }}>{`R${r}`}</Text><Text style={{ color: colors.fg, fontSize: 13, fontWeight: '800' }}>{w ? w.code : '·'}</Text></Pressable></Reveal>); })}
        </View>
        {sel ? <Note>{`Round ${sel}: ${info.names[sel] || ''}${info.win[sel] ? `. Won by ${info.win[sel].last} (${info.win[sel].team || ''}).` : '. Not run yet.'}`}</Note> : null}
        <Eyebrow>Who led the championship</Eyebrow>
        {info.runs.map((r) => (<Card key={`${r.name}${r.from}`}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontWeight: '700' }}>{r.name}</Text><Text style={{ color: colors.muted }}>{r.from === r.to ? `Round ${r.from}` : `Rounds ${r.from} to ${r.to}`}</Text></View></Card>))}
      </>) : null}
    </Screen>);
}
