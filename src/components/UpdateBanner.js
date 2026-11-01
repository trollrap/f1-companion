import React, { useEffect, useState } from 'react';
import { Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import Grad from './Grad';
import { checkUpdate } from '../lib/update';
import { colors } from '../theme';
// Shown at the top of Home when a newer release exists.
export default function UpdateBanner() {
  const [u, setU] = useState(null);
  useEffect(() => { checkUpdate(false).then(setU).catch(() => {}); }, []);
  if (u?.status !== 'available') return null;
  return (
    <Pressable onPress={() => Linking.openURL(u.url).catch(() => {})} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.85 }}>
      <Grad color={colors.good} from={0.3} to={0.04} border={0.5} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="cloud-download-outline" size={24} color={colors.fg} />
        <Text style={{ flex: 1, color: colors.fg, fontSize: 17, fontWeight: '700' }}>{`Update ${u.version} is ready. Tap to download.`}</Text>
      </Grad>
    </Pressable>
  );
}
