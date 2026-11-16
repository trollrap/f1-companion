import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './Text';
import { Card, Eyebrow } from './Screen';
import { useAsync } from '../hooks/useAsync';
import { seasonPoints } from '../api/jolpica';
import { YEAR } from '../api/openf1';
import { colors, alpha } from '../theme';

// Live season head-to-head for two pinned drivers. `rows` are the current driver standings; the pair is [driverIdA, driverIdB].
export function useRivalry(pair, rows) {
  const a = rows.find((r) => r.driverId === pair?.[0]); const b = rows.find((r) => r.driverId === pair?.[1]);
  const sp = useAsync(() => (a && b ? seasonPoints(YEAR).catch(() => null) : Promise.resolve(null)), [a?.driverId, b?.driverId, a?.points, b?.points]);
  let rounds = null;
  const d = sp.v?.drivers; if (d && a && b) { const A = d.find((x) => x.driverId === a.driverId), B = d.find((x) => x.driverId === b.driverId);
    if (A && B) { let ah = 0, bh = 0, t = 0; const n = Math.min(A.pts.length, B.pts.length); const by = (o, i) => o.pts[i] - (i ? o.pts[i - 1] : 0); for (let i = 0; i < n; i++) { const x = by(A, i), y = by(B, i); if (x > y) ah++; else if (y > x) bh++; else t++; } rounds = { ah, bh, t }; } }
  return { a, b, rounds };
}
const Side = ({ r, win, color }) => (<View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{r.last}</Text><Text style={{ color: win ? colors.gold : colors.fg, fontSize: 34, fontWeight: '800' }}>{r.points}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{`P${r.position} · ${r.wins} win${r.wins === 1 ? '' : 's'}`}</Text></View>);
export default function RivalryCard({ pair, rows, onPress }) {
  const { a, b, rounds } = useRivalry(pair, rows); if (!a || !b) return null;
  const gap = Math.abs(a.points - b.points); const lead = a.points === b.points ? null : a.points > b.points ? a : b;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Rivalry: ${a.name} against ${b.name}`} onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.88 }}>
      <Card>
        <Eyebrow>Your rivalry</Eyebrow>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Side r={a} win={a.points > b.points} /><Text style={{ color: colors.muted, fontWeight: '800' }}>vs</Text><Side r={b} win={b.points > a.points} />
        </View>
        <Text style={{ color: colors.fg, fontSize: 14, textAlign: 'center', marginTop: 6 }}>{lead ? `${lead.last} leads by ${gap} point${gap === 1 ? '' : 's'}` : 'Level on points'}</Text>
        {rounds ? <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 2 }}>{`Out-scored the other in ${rounds.ah} rounds (${a.last}) and ${rounds.bh} (${b.last})${rounds.t ? `, ${rounds.t} level` : ''}`}</Text> : null}
      </Card>
    </Pressable>);
}
