import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '../components/Text';
import Screen from '../components/Screen';
import Grad from '../components/Grad';
import Reveal from '../components/Reveal';
import Press from '../components/Press';
import { StatHeader } from '../components/StatRows';
import { RULES } from '../data/rules';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';

// Rules as cards: category pills on top, every rule a numbered card with its own colour so the page is easy to scan.
const TINT = [colors.accent, colors.gold, colors.purple, colors.good, colors.sprint];
export default function RulesScreen() {
  const [key, setKey] = useState(RULES[0].key); const cat = RULES.find((r) => r.key === key) || RULES[0];
  return (
    <Screen header={false}>
      <StatHeader title="F1 rules" icon="book" color={colors.purple} note={`${RULES.length} sections of how the sport works. ${cat.items.length} rules in ${cat.title}.`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {RULES.map((r) => { const on = r.key === key; return (
          <Press key={r.key} onPress={() => { hap.tap(); setKey(r.key); }} accessibilityLabel={r.title}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: on ? colors.accent : colors.card, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}>
              <Text style={{ color: on ? '#fff' : colors.fg, fontWeight: '700', fontSize: 14 }}>{r.title}</Text>
            </View>
          </Press>); })}
      </ScrollView>
      {cat.items.map(([t, x], i) => { const c = TINT[i % TINT.length]; return (
        <Reveal key={`${cat.key}${t}`} index={i}>
          <Grad color={c} from={0.2} to={0.03} radius={16} border={0.3} style={{ padding: 14, flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: alpha(c, 0.25), alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c, fontWeight: '900', fontSize: 15 }}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 17, fontWeight: '800' }}>{t}</Text><Text style={{ color: colors.onSoft, fontSize: 15, marginTop: 4, lineHeight: 21 }}>{x}</Text></View>
          </Grad>
        </Reveal>); })}
    </Screen>
  );
}
