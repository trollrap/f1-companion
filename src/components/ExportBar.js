import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { shareImage, saveImage } from '../lib/exportImage';
import { colors } from '../theme';
// "Share picture" and "Save to gallery" for a captured view.
export default function ExportBar({ target, fallback }) {
  const [msg, setMsg] = useState('');
  const run = async (fn, okText) => { const r = await fn(target); setMsg(r === 'ok' ? okText : r === 'denied' ? 'Allow access to photos to save the picture.' : r === 'unavailable' ? 'Pictures need the latest app build.' : 'That did not work, try again.'); if (r === 'unavailable' && fallback) fallback(); };
  const B = ({ icon, label, onPress }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent }, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={18} color={colors.accent} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <B icon="share-social-outline" label="Share picture" onPress={() => run(shareImage, 'Shared.')} />
        <B icon="download-outline" label="Save picture" onPress={() => run(saveImage, 'Saved to your gallery.')} />
      </View>
      {msg ? <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>{msg}</Text> : null}
    </View>
  );
}
