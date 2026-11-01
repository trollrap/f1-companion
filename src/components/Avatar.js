import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { initials } from '../hooks/useProfile';
import { alpha } from '../theme';
export default function Avatar({ profile, size = 36 }) {
  const c = profile?.color || '#3B82F6';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: alpha(c, 0.22), borderWidth: 1.5, borderColor: c, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c, fontFamily: 'display', fontWeight: '800', fontSize: size * 0.4 }}>{initials(profile?.name)}</Text>
    </View>
  );
}
