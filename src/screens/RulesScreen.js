import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow } from '../components/Screen';
import Dropdown from '../components/Dropdown';
import { RULES } from '../data/rules';
import { colors } from '../theme';

export default function RulesScreen() {
  const [key, setKey] = useState(RULES[0].key); const cat = RULES.find((r) => r.key === key);
  return (
    <Screen header={false}>
      <Dropdown prefix="Category" value={key} onChange={setKey} options={RULES.map((r) => [r.key, r.title])} />
      <Card>
        <Eyebrow>{cat.title}</Eyebrow>
        {cat.items.map(([t, x]) => (<View key={t} style={s.item}><Text style={s.t}>{t}</Text><Text style={s.x}>{x}</Text></View>))}
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({ item: { marginTop: 14 }, t: { color: colors.fg, fontSize: 18, fontWeight: '700' }, x: { color: '#CDD0D8', fontSize: 17, marginTop: 3 } });
