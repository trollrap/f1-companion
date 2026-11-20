import React, { useState } from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, alpha } from '../theme';
import * as hap from '../lib/haptics';
const TYPES = [['Practice 1', 'Practice 1'], ['Practice 2', 'Practice 2'], ['Practice 3', 'Practice 3'], ['Sprint Qualifying', 'Sprint qualifying'], ['Sprint', 'Sprint'], ['Qualifying', 'Qualifying'], ['Race', 'Race']];
const RANGE = [[0, 'All remaining weekends'], [1, 'Next weekend only'], [3, 'Next 3 weekends'], [5, 'Next 5 weekends']];
// Choose exactly which sessions go into the calendar file, and for how many weekends.
export default function CalendarPicker({ visible, onClose, onDone }) {
  const [types, setTypes] = useState(['Sprint', 'Qualifying', 'Race']); const [next, setNext] = useState(0);
  const flip = (t) => { hap.tap(); setTypes((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t])); };
  const Chip = ({ on, label, onPress, icon }) => (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: on ? colors.accent : colors.line, backgroundColor: on ? alpha(colors.accent, 0.18) : colors.card }, pressed && { opacity: 0.8 }]}>
      <Ionicons name={on ? (icon || 'checkbox') : (icon ? 'ellipse-outline' : 'square-outline')} size={20} color={on ? colors.accent : colors.muted} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>);
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.66)', justifyContent: 'center', padding: 20 }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
        <View style={{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 22, padding: 18, maxHeight: '88%' }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>Add to my calendar</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>Pick the sessions you want. Times are saved in UTC, so your calendar shows them in your own time, with a reminder 30 minutes before.</Text>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 16, marginBottom: 8 }}>SESSIONS</Text>
            <View style={{ gap: 8 }}>{TYPES.map(([v, l]) => <Chip key={v} on={types.includes(v)} label={l} onPress={() => flip(v)} />)}</View>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 16, marginBottom: 8 }}>HOW MANY WEEKENDS</Text>
            <View style={{ gap: 8 }}>{RANGE.map(([v, l]) => <Chip key={v} icon="radio-button-on" on={next === v} label={l} onPress={() => { hap.tap(); setNext(v); }} />)}</View>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Pressable onPress={onClose} style={{ flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.muted, fontWeight: '700', fontSize: 16 }}>Cancel</Text></Pressable>
            <Pressable disabled={!types.length} onPress={() => onDone({ types, next })} style={{ flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: types.length ? colors.accent : colors.line }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Add</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>);
}
