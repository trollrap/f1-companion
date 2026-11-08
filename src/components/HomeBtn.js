import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
// Top-right button of every inner screen: one tap back to the first screen. `children` (a star, a gear) sit to its left.
export default function HomeBtn({ children }) {
  const nav = useNavigation();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {children}
      <Pressable onPress={() => nav.popToTop()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Home" style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
        <Ionicons name="home-outline" size={21} color={colors.fg} />
      </Pressable>
    </View>
  );
}
