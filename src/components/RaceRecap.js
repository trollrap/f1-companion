import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import ShareCard from './ShareCard';
import Grad from './Grad';
import { HeadShot } from './Shared';
import { colors, alpha, teamColor } from '../theme';
import { recapOf } from '../lib/recap';
// Home card: the latest race at a glance (winner hero, podium, fact tiles), shareable as a picture.
const TILES = ['Pole', 'Fastest lap', 'Biggest climb', 'Retirements', 'Title fight'];
export default function RaceRecap({ race, standings }) {
  const R = React.useMemo(() => { try { return recapOf(race, standings); } catch { return null; } }, [race, standings]);
  if (!R) return null;
  const w = R.win; const tc = w.teamId ? teamColor(w.teamId) : colors.accent; const get = (k) => (R.lines.find((l) => l.k === k) || {}).v;
  const tiles = TILES.map((k) => [k, get(k)]).filter((t) => t[1]);
  return (
    <ShareCard title={`${R.title} recap\n${R.lines.map((l) => `${l.k}: ${l.v}`).join('\n')}`}>
      <Grad color={tc} from={0.5} to={0.05} radius={22} border={0.45} style={{ padding: 16, gap: 14 }}>
        <Text style={{ color: colors.onSoft, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>{`RACE RECAP · ${R.title.toUpperCase()}`}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {w.driverId ? <HeadShot id={w.driverId} size={64} color={tc} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>WINNER</Text>
            <Text style={{ color: colors.fg, fontSize: 24, fontWeight: '900' }} numberOfLines={1}>{`${w.first} ${w.last}`}</Text>
            <Text style={{ color: colors.onSoft, fontSize: 13 }}>{`${w.team} · from ${w.grid > 0 ? `P${w.grid}` : 'the pit lane'}`}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {R.podium.map((r) => (
            <View key={r.position} style={{ flex: 1, padding: 8, borderRadius: 12, backgroundColor: alpha(colors.fg, 0.07), alignItems: 'center' }}>
              <Text style={{ color: r.position === 1 ? colors.gold : colors.muted, fontSize: 12, fontWeight: '800' }}>{`P${r.position}`}</Text>
              <Text style={{ color: colors.fg, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{r.last}</Text>
            </View>))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {tiles.map(([k, v]) => (
            <View key={k} style={{ width: '48.5%', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: alpha(colors.fg, 0.1), backgroundColor: alpha(colors.bg, 0.35) }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{k.toUpperCase()}</Text>
              <Text style={{ color: colors.fg, fontSize: 13, marginTop: 2 }} numberOfLines={3}>{v}</Text>
            </View>))}
        </View>
      </Grad>
    </ShareCard>);
}
