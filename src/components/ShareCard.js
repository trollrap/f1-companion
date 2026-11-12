import React, { useRef } from 'react';
import { View, Pressable, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, alpha } from '../theme';
import { shareImage, canShareImage } from '../lib/exportImage';
// Wraps any card so it can be shared as a picture. `title` is the text fallback when image sharing is not in the build.
export default function ShareCard({ children, title = 'F1 Companion' }) {
  const ref = useRef(null);
  const go = async () => { const r = canShareImage() ? await shareImage(ref) : 'unavailable'; if (r === 'unavailable' || r === 'error') { try { await Share.share({ message: title }); } catch {} } };
  return (
    <View>
      <View ref={ref} collapsable={false} style={{ backgroundColor: colors.bg, borderRadius: 18 }}>{children}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="Share this card as a picture" hitSlop={8} onPress={go} style={({ pressed }) => [{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: alpha(colors.accent, 0.14) }, pressed && { opacity: 0.7 }]}>
        <Ionicons name="share-outline" size={15} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>Share</Text>
      </Pressable>
    </View>);
}
