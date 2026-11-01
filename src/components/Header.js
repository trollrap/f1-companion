import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Image } from 'react-native';
import { appLogo } from '../lib/media';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
export default function Header() {
  const nav = useNavigation();
  return (
    <View style={s.top}>
      <View style={s.logo}>
        {appLogo ? <Image source={appLogo} resizeMode="contain" style={{ height: 30, aspectRatio: 1704 / 205 }} /> : <><View style={s.bar} /><Text style={s.word}>F1<Text style={{ color: colors.accent }}>·</Text>COMPANION</Text></>}
      </View>
      <Pressable onPress={() => nav.navigate('Settings')} hitSlop={10} accessibilityLabel="Settings" style={({ pressed }) => [s.btn, pressed && { opacity: 0.6 }]}>
        <Ionicons name="settings-outline" size={24} color={colors.fg} />
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 }, bar: { width: 4, height: 22, borderRadius: 2, backgroundColor: colors.accent },
  word: { fontFamily: 'label', color: colors.fg, fontWeight: '700', fontSize: 19, letterSpacing: 2.5 }, btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
