import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, alpha } from '../theme';
import { useSpoilerHidden, reveal } from '../lib/spoiler';
// Wraps results. Hidden behind a tap while the Spoiler guard setting is on.
export default function SpoilerGuard({ id, label = 'Results hidden', children }) {
  const hidden = useSpoilerHidden(id);
  if (!hidden) return children;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. Tap to reveal.`} onPress={() => reveal(id)} style={({ pressed }) => [{ marginTop: 8, padding: 18, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: alpha(colors.fg, 0.04), flexDirection: 'row', alignItems: 'center', gap: 10 }, pressed && { opacity: 0.7 }]}>
      <Ionicons name="eye-off-outline" size={20} color={colors.muted} /><Text style={{ color: colors.muted, fontWeight: '700', flex: 1 }}>{`${label}. Tap to reveal.`}</Text>
    </Pressable>);
}
