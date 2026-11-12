import React from 'react';
import { View } from 'react-native';
import Skeleton from './Skeleton';
import { Text } from './Text';
import { Card, Eyebrow, Note } from './Screen';
import { useAsync } from '../hooks/useAsync';
import { racePace, qualiGaps } from '../api/openf1';
import { colors, alpha } from '../theme';

const lap = (s) => { const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}`; };
const Bar = ({ label, sub, v, max, color, right, bold }) => (
  <View accessible accessibilityLabel={`${label}, ${right}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
    <Text style={{ width: 78, color: colors.fg, fontWeight: bold ? '800' : '600', fontSize: 14 }} numberOfLines={1}>{label}</Text>
    <View style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: alpha(colors.muted, 0.12), overflow: 'hidden' }}><View style={{ width: `${Math.max(2, Math.min(100, (v / max) * 100))}%`, height: 14, borderRadius: 7, backgroundColor: color || colors.accent }} /></View>
    <Text style={{ width: 64, textAlign: 'right', color: colors.fg, fontSize: 13, fontWeight: '700' }}>{right}</Text>
  </View>);
// Race pace ranking: average clean lap per driver as a gap to the quickest.
export function RacePace({ sessionKey }) {
  const a = useAsync(() => racePace(sessionKey), [sessionKey]); const d = a.v;
  if (a.error || (d && !d.rows.length)) return null;
  const max = d ? Math.max(1, Math.min(4, d.rows[d.rows.length - 1].gap)) : 1;
  return (
    <Card>
      <Eyebrow>Race pace</Eyebrow>
      {a.loading ? <Skeleton rows={3} /> : null}
      {d ? (<View style={{ marginTop: 4 }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{`Average clean lap, gap to the quickest (${d.rows[0].last}, ${lap(d.rows[0].avg)}). Fastest single lap: ${d.fastest.last}, ${lap(d.fastest.best)}.`}</Text>
        {d.rows.map((r, i) => <Bar key={r.number} label={r.last} v={r.gap} max={max} color={r.color} bold={i === 0} right={i === 0 ? lap(r.avg) : `+${r.gap.toFixed(3)}`} />)}
        <Note>Pit laps, the first lap and laps over 7% slower than a driver's own median are left out, so safety-car laps do not count. Bars are capped at 4 seconds.</Note>
      </View>) : null}
    </Card>);
}
// Qualifying gap chart: gap to the quickest car of the segment each driver reached, plus the team-mate gaps.
export function QualiGaps({ sessionKey }) {
  const a = useAsync(() => qualiGaps(sessionKey), [sessionKey]); const d = a.v;
  if (a.error || (d && !d.rows.length)) return null;
  const maxGap = d ? Math.max(0.3, ...d.rows.map((r) => r.gap)) : 1;
  return (
    <Card>
      <Eyebrow>Qualifying gaps</Eyebrow>
      {a.loading ? <Skeleton rows={3} /> : null}
      {d ? (<View style={{ marginTop: 4 }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Gap to the quickest car of the last session each driver reached (Q1, Q2 or Q3).</Text>
        {d.rows.map((r, i) => <Bar key={r.number} label={r.last} v={r.gap} max={maxGap} color={r.color} bold={r.gap === 0} right={r.gap === 0 ? `Q${r.seg} ${lap(r.time)}` : `Q${r.seg} +${r.gap.toFixed(3)}`} />)}
        {d.mates.length ? (<View style={{ marginTop: 14 }}><Text style={{ color: colors.accent, fontFamily: 'label', fontSize: 12, letterSpacing: 2 }}>TEAM-MATE GAPS</Text>
          {d.mates.map((m) => (<View key={m.team} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line }}><View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: m.color || colors.muted }} /><Text style={{ flex: 1, color: colors.fg, fontSize: 14 }} numberOfLines={1}><Text style={{ fontWeight: '800' }}>{m.fast}</Text>{` over ${m.slow}`}</Text><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 14 }}>{`${m.gap.toFixed(3)}s`}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{`Q${m.seg}`}</Text></View>))}
        </View>) : null}
      </View>) : null}
    </Card>);
}
