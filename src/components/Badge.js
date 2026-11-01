import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { colors, alpha } from '../theme';
export function Pill({ children, color = colors.muted, solid, style }) {
  return (
    <View style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, backgroundColor: solid ? color : alpha(color, 0.16), alignSelf: 'flex-start' }, style]}>
      <Text style={{ fontFamily: 'label', fontWeight: '700', fontSize: 11, letterSpacing: 1.4, color: solid ? '#0A0506' : color }}>{String(children).toUpperCase()}</Text>
    </View>
  );
}
export const SprintBadge = ({ style }) => <Pill color={colors.sprint} solid style={style}>Sprint</Pill>;
