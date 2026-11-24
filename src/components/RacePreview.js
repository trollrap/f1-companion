import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Card, Eyebrow, Note } from './Screen';
import { useFavs } from '../hooks/useFavs';
import { circuitSummary } from '../api/history';
import { colors } from '../theme';

// Race preview: what the built-in history says about this Grand Prix, and how your favourite drivers have done here.
export default function RacePreview({ name }) {
  const favs = useFavs(); const ids = favs && Array.isArray(favs.drivers) ? favs.drivers : [];
  const S = useMemo(() => { try { return circuitSummary(name, ids); } catch { return null; } }, [name, ids.join(',')]);
  if (!S) return null;
  return (
    <Card>
      <Eyebrow>Race preview</Eyebrow>
      <Text style={{ color: colors.muted, fontSize: 14 }}>{`${S.editions} editions from ${S.first} to ${S.last}${S.poleWinRate != null ? ` · pole won ${Math.round(S.poleWinRate * 100)}%` : ''}`}</Text>
      <Text style={{ color: colors.fg, fontWeight: '700', marginTop: 8 }}>Recent winners</Text>
      {S.recent.map((r) => (<View key={r.year} style={{ flexDirection: 'row', gap: 8 }}><Text style={{ color: colors.accentText, fontWeight: '700', width: 44 }}>{r.year}</Text><Text style={{ color: colors.fg, flex: 1 }} numberOfLines={1}>{`${r.winner}${r.team ? `, ${r.team}` : ''}`}</Text></View>))}
      <Text style={{ color: colors.fg, fontWeight: '700', marginTop: 8 }}>Most wins here</Text>
      <Text style={{ color: colors.fg }}>{S.top.map((t) => `${t.name} (${t.n})`).join(', ')}</Text>
      {S.favs.length ? (<View style={{ marginTop: 8 }}><Text style={{ color: colors.fg, fontWeight: '700' }}>Your drivers here</Text>{S.favs.map((f) => (<Text key={f.id} style={{ color: colors.fg }}>{`${f.name}: ${f.starts} start${f.starts === 1 ? '' : 's'}, ${f.wins} win${f.wins === 1 ? '' : 's'}, ${f.podiums} podium${f.podiums === 1 ? '' : 's'}${f.best ? `, best finish P${f.best}` : ''}`}</Text>))}</View>) : <Note>Favourite a driver in the Paddock to see how they have done at this circuit.</Note>}
    </Card>);
}
