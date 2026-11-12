import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Card, Eyebrow } from './Screen';
import ShareCard from './ShareCard';
import { colors, alpha } from '../theme';
import { recapOf } from '../lib/recap';
// Home card: the latest race in six lines, shareable as a picture.
export default function RaceRecap({ race, standings }) {
  const R = React.useMemo(() => { try { return recapOf(race, standings); } catch { return null; } }, [race, standings]);
  if (!R) return null;
  return (
    <ShareCard title={`${R.title} recap\n${R.lines.map((l) => `${l.k}: ${l.v}`).join('\n')}`}>
      <Card>
        <Eyebrow>{`Race recap · ${R.title}`}</Eyebrow>
        {R.lines.map((l, i) => (
          <View key={l.k} style={{ flexDirection: 'row', gap: 10, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: alpha(colors.fg, 0.08), marginTop: i ? 0 : 6 }}>
            <Text style={{ width: 96, color: colors.muted, fontSize: 13, fontWeight: '700' }}>{l.k}</Text><Text style={{ flex: 1, color: colors.fg, fontSize: 15 }}>{l.v}</Text>
          </View>))}
      </Card>
    </ShareCard>);
}
