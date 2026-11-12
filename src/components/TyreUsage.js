import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Card, Eyebrow, Note } from './Screen';
import ShareCard from './ShareCard';
import { tyreUsage } from '../lib/tyres';
import { colors, alpha } from '../theme';
const TYRE = { SOFT: ['#E10600'], MEDIUM: ['#FFD12E'], HARD: ['#F2F2F2'], INTERMEDIATE: ['#3DD16C'], WET: ['#3B82F6'], UNKNOWN: ['#6B7280'] };
const NAME = { SOFT: 'Soft', MEDIUM: 'Medium', HARD: 'Hard', INTERMEDIATE: 'Intermediate', WET: 'Wet', UNKNOWN: 'Unknown' };
// Tyre usage card under the strategy chart: how much of the race each compound ran, stint lengths, and each team's mix.
export default function TyreUsage({ data }) {
  const U = useMemo(() => { try { return tyreUsage(data); } catch { return null; } }, [data]);
  if (!U) return null;
  return (
    <ShareCard title={`Tyre usage: ${U.comps.map((c) => `${NAME[c.compound]} ${Math.round(c.share * 100)}%`).join(', ')}`}>
      <Card>
        <Eyebrow>Tyre usage</Eyebrow>
        <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginTop: 10 }}>
          {U.comps.map((c) => <View key={c.compound} style={{ flex: c.laps, backgroundColor: (TYRE[c.compound] || TYRE.UNKNOWN)[0] }} />)}
        </View>
        {U.comps.map((c) => (
          <View key={c.compound} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: alpha(colors.fg, 0.08), marginTop: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: (TYRE[c.compound] || TYRE.UNKNOWN)[0] }} />
            <Text style={{ width: 92, color: colors.fg, fontWeight: '800' }}>{NAME[c.compound]}</Text>
            <Text style={{ flex: 1, color: colors.muted, fontSize: 13 }}>{`${c.stints} stints · avg ${c.avg.toFixed(1)} laps · longest ${c.longest.len} (${c.longest.last})`}</Text>
            <Text style={{ color: colors.fg, fontWeight: '900' }}>{`${Math.round(c.share * 100)}%`}</Text>
          </View>))}
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>{`Most common plan: ${U.commonStops} stop${U.commonStops === 1 ? '' : 's'} (${U.commonCount} of ${U.cars} cars).`}</Text>
        <Eyebrow>Teams</Eyebrow>
        {U.teams.map((t) => (
          <View key={t.team} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{t.team}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{`${t.avgStops.toFixed(1)} stops per car`}</Text></View>
            <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
              {Object.keys(t.laps).sort((a, b) => ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET', 'UNKNOWN'].indexOf(a) - ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET', 'UNKNOWN'].indexOf(b)).map((k) => <View key={k} style={{ flex: t.laps[k], backgroundColor: (TYRE[k] || TYRE.UNKNOWN)[0] }} />)}
            </View>
          </View>))}
        <Note>Laps are counted from each stint's first and last lap as OpenF1 reports them. Bars show each team's laps on every compound, both cars together.</Note>
      </Card>
    </ShareCard>);
}
