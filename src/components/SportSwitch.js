import React, { useState } from 'react';
import { View, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { usePrefs } from '../hooks/usePrefs';
import { colors, alpha } from '../theme';
const SPORTS = [['f1', 'Formula 1', 'speedometer-outline', true], ['motogp', 'MotoGP', 'bicycle-outline', true], ['football', 'Football', 'football-outline', true]];
// Small chip at the top left: shows the current sport and opens a list to swap.
export default function SportSwitch() {
  const { prefs, setOpt } = usePrefs(); const [open, setOpen] = useState(false); const cur = ['motogp', 'football'].includes(prefs.opts.sport) ? prefs.opts.sport : 'f1';
  const pick = (k) => { setOpen(false); if (k !== cur) setOpt('sport', k); };
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} accessibilityLabel="Change sport" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 9, borderRadius: 10, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent }, pressed && { opacity: 0.7 }]}>
        <Text style={{ color: colors.fg, fontFamily: 'label', fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>{cur === 'motogp' ? 'MOTOGP' : cur === 'football' ? 'FOOTBALL' : 'F1'}</Text>
        <Ionicons name="swap-horizontal" size={14} color={colors.accent} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 24 }}>
          <View style={{ borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: alpha(colors.accent, 0.4), padding: 10, gap: 6 }}>
            <Text style={{ color: colors.muted, fontFamily: 'label', fontSize: 12, letterSpacing: 2.4, textAlign: 'center', paddingVertical: 8 }}>CHOOSE A SPORT</Text>
            {SPORTS.map(([k, label, icon, on]) => (
              <Pressable key={k} disabled={!on} onPress={() => pick(k)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: k === cur ? colors.accent : colors.line, opacity: on ? 1 : 0.5 }, pressed && { opacity: 0.7 }]}>
                <Ionicons name={icon} size={22} color={k === cur ? colors.accent : colors.fg} />
                <Text style={{ color: colors.fg, fontSize: 19, fontWeight: '700', flex: 1 }}>{label}</Text>
                {!on ? <Text style={{ color: colors.muted, fontSize: 13 }}>Coming soon</Text> : k === cur ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
              </Pressable>))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
