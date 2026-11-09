import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors } from '../theme';
// A short guided tour: shown once after the welcome screen, and again from Settings.
const SLIDES = [
  ['home', 'Home', 'Your next race with a live countdown, the Race day dashboard, your favourite drivers and teams, and the latest session. Settings > Home layout lets you reorder or hide cards.'],
  ['calendar', 'Calendar and standings', 'Tap any race for every session, results, strategy and the circuit. Standings cover drivers and teams, and every driver page has stats, team-mate battles and comparisons.'],
  ['trophy', 'Predictions and friends', 'Pick pole and the podium before each race. Make a room, send the code to friends and the leaderboard updates by itself. Streaks and badges come with it.'],
  ['sparkles', 'Fun and fantasy', 'Run your own fantasy seasons with real or made-up drivers, watch races lap by lap, read the newspaper and become a Team Principal with upgrades, staff and sponsors.'],
  ['settings', 'Make it yours', 'Settings has dark, AMOLED and white themes, text size, alerts, offline mode and a backup you can restore on a new phone. The gear is top right on every screen.'],
];
export default function Tour({ visible, onClose }) {
  const [i, setI] = useState(0); const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (visible) setI(0); }, [visible]);
  useEffect(() => { v.setValue(0); Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [i, visible]);
  if (!visible) return null;
  const [ic, title, text] = SLIDES[i]; const last = i === SLIDES.length - 1;
  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 26, padding: 24 }}>
          <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }], alignItems: 'center', gap: 14, minHeight: 250, justifyContent: 'center' }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={ic} size={38} color={colors.accent} /></View>
            <Text style={{ color: colors.fg, fontSize: 26, fontWeight: '800', textAlign: 'center' }}>{title}</Text>
            <Text style={{ color: colors.muted, fontSize: 17, lineHeight: 24, textAlign: 'center' }}>{text}</Text>
          </Animated.View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 14 }}>{SLIDES.map((_, k) => <View key={k} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? colors.accent : colors.line }} />)}</View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={onClose} style={({ pressed }) => [{ flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.muted, fontSize: 17, fontWeight: '700' }}>{last ? 'Close' : 'Skip'}</Text></Pressable>
            <Pressable onPress={() => (last ? onClose() : setI(i + 1))} style={({ pressed }) => [{ flex: 1.4, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }, pressed && { opacity: 0.85 }]}><Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>{last ? 'Start' : 'Next'}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
Tour.ghost = true;
