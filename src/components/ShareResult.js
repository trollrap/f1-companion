import React from 'react';
import { View, Pressable, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import ShareCard from './ShareCard';
import { colors, alpha } from '../theme';
// A result card that can be shared two ways: as a picture (when this build can) or as plain text with an emoji grid.
export default function ShareResult({ text, children }) {
  const go = async () => { try { await Share.share({ message: text }); } catch {} };
  return (
    <View>
      <ShareCard title={text}>{children}</ShareCard>
      <Pressable accessibilityRole="button" accessibilityLabel="Share the result as text" hitSlop={8} onPress={go} style={({ pressed }) => [{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: alpha(colors.accent, 0.14) }, pressed && { opacity: 0.7 }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.accentText} /><Text style={{ color: colors.accentText, fontSize: 12, fontWeight: '800' }}>Share as text</Text>
      </Pressable>
    </View>);
}

// Just the text button, for games that have no result card.
export function ShareTextBtn({ text }) {
  const go = async () => { try { await Share.share({ message: text }); } catch {} };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Share the result as text" onPress={go} style={({ pressed }) => [{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: alpha(colors.accent, 0.14) }, pressed && { opacity: 0.7 }]}>
      <Ionicons name="share-outline" size={16} color={colors.accentText} /><Text style={{ color: colors.accentText, fontSize: 13, fontWeight: '800' }}>Share result</Text>
    </Pressable>);
}
