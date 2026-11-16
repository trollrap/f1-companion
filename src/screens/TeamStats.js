import React, { useMemo, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Reveal from '../components/Reveal';
import { Segmented } from '../components/Shared';
import { colors, alpha } from '../theme';
import { norm } from '../lib/names';
import { teamSeasons, gpList, gpEditions } from '../api/history';

const COLS = [colors.accent, colors.gold];
function TeamPick({ i, team, all, onPick }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false);
  const sugg = useMemo(() => { const n = norm(q); if (n.length < 2) return []; return all.filter((t) => norm(t.name).includes(n)).slice(0, 6); }, [q, all]);
  return (
    <View style={{ flex: 1 }}>
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={{ padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLS[i], backgroundColor: alpha(COLS[i], 0.12) }}>
        <Text style={{ color: colors.fg, fontWeight: '800' }} numberOfLines={1}>{team ? team.name : 'Pick a team'}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Tap to change</Text></Pressable>
      {open ? (<View style={{ marginTop: 6 }}>
        <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Search a team" placeholderTextColor={colors.muted} accessibilityLabel="Search a team" style={{ color: colors.fg, fontSize: 16, padding: 10, borderRadius: 10, backgroundColor: colors.card }} />
        {sugg.map((t) => (<Pressable key={t.id} accessibilityRole="button" onPress={() => { onPick(t.id); setOpen(false); setQ(''); }} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }}><Text style={{ color: colors.fg }}>{`${t.name} · ${t.years[0].y}-${t.years[t.years.length - 1].y}`}</Text></Pressable>))}
      </View>) : null}
    </View>);
}

export function TeamCurvesScreen() {
  const all = useMemo(() => { try { return teamSeasons(); } catch { return []; } }, []);
  const [ids, setIds] = useState(['ferrari', 'mclaren']); const [m, setM] = useState('wins'); const [w, setW] = useState(0);
  const teams = ids.map((id) => all.find((t) => t.id === id) || null);
  if (!all.length) return <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;
  const y0 = Math.min(...teams.filter(Boolean).map((t) => t.years[0].y), 3000), y1 = Math.max(...teams.filter(Boolean).map((t) => t.years[t.years.length - 1].y), 0);
  const series = teams.map((t) => { if (!t) return null; let cum = 0; const by = {}; t.years.forEach((x) => { cum += x.wins; by[x.y] = { wins: cum, share: x.share * 100 }; });
    const pts = []; let last = 0; for (let y = t.years[0].y; y <= t.years[t.years.length - 1].y; y++) { if (by[y]) { last = by[y].wins; pts.push({ y, v: m === 'wins' ? by[y].wins : by[y].share }); } else if (m === 'wins') pts.push({ y, v: last }); else pts.push({ y, v: null }); } return pts; });
  const top = Math.max(1, ...series.flatMap((s) => (s || []).map((p) => p.v || 0)));
  const H = 220, L = 40, R = 12, T = 12, B = 24; const iw = Math.max(1, w - L - R); const span = Math.max(1, y1 - y0);
  const x = (yr) => L + ((yr - y0) / span) * iw, y = (v) => T + (1 - v / top) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f)); const step = Math.max(1, Math.ceil((span + 1) / 7));
  const runs = (s) => { const out = []; let cur = []; (s || []).forEach((p) => { if (p.v === null) { if (cur.length) out.push(cur); cur = []; } else cur.push(p); }); if (cur.length) out.push(cur); return out; };
  return (
    <Screen header={false}>
      <Card><Eyebrow>Team curves</Eyebrow><Note>Two teams over the years. Wins add up season by season. Share of points is the team's part of every point scored that season, so different points systems compare. Race points only. A team that was renamed counts as a new line.</Note></Card>
      <View style={{ flexDirection: 'row', gap: 10 }}>{[0, 1].map((i) => <TeamPick key={i} i={i} team={teams[i]} all={all} onPick={(id) => setIds((a) => a.map((v, k) => (k === i ? id : v)))} />)}</View>
      <Segmented value={m} items={[['wins', 'Total wins'], ['share', 'Share of points']]} onChange={setM} />
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && y1 > 0 ? (
          <Svg width={w} height={H}>
            {ticks.map((v) => (<React.Fragment key={v}><Line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke={colors.line} strokeWidth={1} /><SvgText x={L - 6} y={y(v) + 4} fontSize={10} fill={colors.muted} textAnchor="end">{m === 'share' ? `${v}%` : v}</SvgText></React.Fragment>))}
            {Array.from({ length: span + 1 }).map((_, k) => ((k % step === 0) ? <SvgText key={k} x={x(y0 + k)} y={H - 6} fontSize={10} fill={colors.muted} textAnchor="middle">{String(y0 + k)}</SvgText> : null))}
            {series.map((s, i) => (s ? <React.Fragment key={i}>{runs(s).map((r, k) => (r.length > 1 ? <Polyline key={k} points={r.map((p) => `${x(p.y).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} fill="none" stroke={COLS[i]} strokeWidth={2.6} strokeLinejoin="round" /> : <Circle key={k} cx={x(r[0].y)} cy={y(r[0].v)} r={3} fill={COLS[i]} />))}</React.Fragment> : null))}
          </Svg>) : null}
      </View>
      {teams.map((t, i) => (t ? (<Card key={i}><Text style={{ color: COLS[i], fontWeight: '800' }}>{t.name}</Text><Text style={{ color: colors.fg, marginTop: 4 }}>{`${t.years.length} seasons, ${t.years[0].y} to ${t.years[t.years.length - 1].y}: ${t.years.reduce((n, a) => n + a.wins, 0)} wins. Best season ${[...t.years].sort((a, b) => b.share - a.share)[0].y} with ${(([...t.years].sort((a, b) => b.share - a.share)[0].share) * 100).toFixed(0)}% of all points.`}</Text></Card>) : null))}
    </Screen>);
}

export function RematchScreen() {
  const list = useMemo(() => { try { return gpList(); } catch { return []; } }, []);
  const [name, setName] = useState('Monaco Grand Prix'); const [q, setQ] = useState('');
  const d = useMemo(() => { try { return gpEditions(name); } catch { return null; } }, [name]);
  if (!list.length || !d) return <Screen header={false}><Note>The built-in history could not be read.</Note></Screen>;
  const n = norm(q); const hits = n.length >= 2 ? list.filter((x) => norm(x.name).includes(n)).slice(0, 8) : [];
  return (
    <Screen header={false}>
      <Card><Eyebrow>Same-race rematches</Eyebrow><Note>Every edition of one Grand Prix, newest first: winner, pole sitter, and where the winner started. Races are matched by name, so a Grand Prix that moved circuits stays one list.</Note></Card>
      <TextInput value={q} onChangeText={setQ} placeholder="Find a Grand Prix" placeholderTextColor={colors.muted} accessibilityLabel="Find a Grand Prix" style={{ color: colors.fg, fontSize: 16, padding: 12, borderRadius: 12, backgroundColor: colors.card }} />
      {hits.map((h) => (<Pressable key={h.name} accessibilityRole="button" onPress={() => { setName(h.name); setQ(''); }} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}><Text style={{ color: colors.fg }}>{`${h.name} · ${h.editions} editions`}</Text></Pressable>))}
      <Card>
        <Eyebrow>{`${name} · ${d.rows.length} editions`}</Eyebrow>
        <Text style={{ color: colors.fg, marginTop: 4 }}>{`Most wins: ${d.most.slice(0, 3).map((x) => `${x.name} ${x.n}`).join(', ')}`}</Text>
        <Text style={{ color: colors.muted, marginTop: 2 }}>{`Pole won ${d.poleWins} of ${d.poleN} times${d.back && d.back.winGrid > 1 ? `. Furthest back a winner started: P${d.back.winGrid}, ${d.back.winner} in ${d.back.year}` : ''}.`}</Text>
      </Card>
      {d.rows.map((r, i) => (
        <Reveal key={r.year} index={Math.min(i, 6)}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800' }}>{r.year}</Text><Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>{r.team}</Text></View>
            <Text style={{ color: colors.fg, marginTop: 3 }}>{`Won by ${r.winner || '—'}${r.winGrid ? ` from P${r.winGrid}` : ''}`}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{`Pole: ${r.pole || '—'}${r.poleFin ? (r.poleFin === '1' ? ' (won)' : /^\d+$/.test(r.poleFin) ? ` (finished P${r.poleFin})` : ' (did not finish)') : ''}${r.fastest ? ` · Fastest lap: ${r.fastest}` : ''}`}</Text>
          </Card>
        </Reveal>))}
    </Screen>);
}
