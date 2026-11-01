import React from 'react';
import { View } from 'react-native';
import Skeleton from './Skeleton';
import { Text } from './Text';
import { Card, Eyebrow, Note } from './Screen';
import { useAsync } from '../hooks/useAsync';
import { raceStints } from '../api/openf1';
import { colors } from '../theme';

export const TYRE = { SOFT: ['#E10600', '#fff', 'S'], MEDIUM: ['#FFD12E', '#14161A', 'M'], HARD: ['#F2F2F2', '#14161A', 'H'], INTERMEDIATE: ['#3DD16C', '#08210F', 'I'], WET: ['#3B82F6', '#fff', 'W'], UNKNOWN: ['#6B7280', '#fff', '?'] };
// One bar per driver: every tyre stint of the race, drawn to scale. Finishing order from the top.
export default function Strategy({ sessionKey }) {
  const st = useAsync(() => raceStints(sessionKey), [sessionKey]);
  const d = st.v;
  return (
    <Card>
      <Eyebrow>Tyre strategy</Eyebrow>
      {st.loading && <Skeleton />}
      {st.error && <Note>Strategy data is not available for this race yet.</Note>}
      {d && !d.rows.length && <Note>No tyre data was published for this race.</Note>}
      {d && d.rows.length > 0 && (
        <View style={{ marginTop: 12, gap: 6 }}>
          {d.rows.map((r) => (
            <View key={r.number} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ width: 28, color: colors.muted, fontSize: 13, textAlign: 'right' }}>{r.position ?? '–'}</Text>
              <Text style={{ width: 82, color: colors.fg, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{r.last}</Text>
              <View style={{ flex: 1, height: 22, flexDirection: 'row', gap: 1.5 }}>
                {r.stints.map((s) => { const [bg, fg, ch] = TYRE[s.compound] || TYRE.UNKNOWN, len = Math.max(1, s.to - s.from + 1);
                  return (<View key={s.n} style={{ flex: len, backgroundColor: bg, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{len >= 6 ? <Text style={{ color: fg, fontSize: 11, fontWeight: '800' }} numberOfLines={1}>{ch}{len >= 12 ? ` ${len}` : ''}</Text> : null}</View>); })}
              </View>
            </View>))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            {['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'].map((k) => (<View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: TYRE[k][0] }} /><Text style={{ color: colors.muted, fontSize: 13 }}>{k[0] + k.slice(1).toLowerCase()}</Text></View>))}
          </View>
        </View>)}
    </Card>
  );
}
