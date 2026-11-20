import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow, Note } from '../components/Screen';
import Press from '../components/Press';
import Reveal from '../components/Reveal';
import { Btn } from '../components/FunBits';
import { useFun } from '../fun/store';
import { sessionsOf, standings } from '../fun/sim';
import { colors } from '../theme';
import { GamesHub } from './GamesHub';

// Everything about fantasy seasons: the saves, a new season, presets and settings.
export function FantasyHub({ navigation }) {
  const [showOld, setShowOld] = useState(false); const fun = useFun(); const live = fun.fantasies.filter((f) => !f.archived); const old = fun.fantasies.filter((f) => f.archived);
  const row = (f, i) => {
    const done = f.races.filter((r) => sessionsOf(r).every((s) => f.results?.[r.id]?.[s])).length; const lead = done ? standings(f).drivers[0] : null;
    return (
      <Reveal key={f.id} index={i + 1}>
        <Press onPress={() => navigation.navigate('Fantasy', { id: f.id })}>
          <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '700' }} numberOfLines={1}>{f.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 15 }}>{`Season ${f.season || 1} · ${f.teams.length} teams · ${done}/${f.races.length} races${lead ? ` · leader ${lead.last}` : ''}`}</Text>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: 8, overflow: 'hidden' }}><View style={{ width: `${f.races.length ? Math.round((done / f.races.length) * 100) : 0}%`, height: 4, backgroundColor: colors.accent }} /></View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View></Card>
        </Press>
      </Reveal>);
  };
  return (
    <Screen>
      <Text style={{ color: colors.fg, fontSize: 24, fontWeight: '800', fontStyle: 'italic' }}>Fantasy</Text>
      <Reveal index={0}><Note>Your own seasons: pick the teams and races, then simulate. Saved automatically on this phone.</Note></Reveal>
      {live[0] ? <Reveal index={0}><Btn icon="play" tone="solid" onPress={() => navigation.navigate('Fantasy', { id: live[0].id })}>{`Continue ${live[0].name}`}</Btn></Reveal> : null}
      <Eyebrow>Saved seasons</Eyebrow>
      {fun.loaded && !live.length && <Note>No fantasy season yet. Make one: pick how many teams there are, choose the races and simulate.</Note>}
      {live.map(row)}
      {old.length ? <View style={{ gap: 10 }}><Press onPress={() => setShowOld((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}><Eyebrow>{`Archived · ${old.length}`}</Eyebrow><Ionicons name={showOld ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} /></Press>{showOld ? <View style={{ gap: 10, opacity: 0.55 }}>{old.map((f, i) => row(f, i))}</View> : null}</View> : null}
      <Btn icon="add-circle-outline" tone="solid" onPress={() => navigation.navigate('FantasyNew')}>New fantasy season</Btn>
      <Btn icon="bookmarks-outline" onPress={() => navigation.navigate('FantasyPresets')}>Presets: drivers, races and grids</Btn>
      <Btn icon="settings-outline" onPress={() => navigation.navigate('FunSettings')}>Fantasy settings</Btn>
    </Screen>);
}

export function FunGames({ navigation }) { return <GamesHub navigation={navigation} />; }
