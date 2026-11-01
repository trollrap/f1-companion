import React from 'react';
import { Text } from 'react-native';
import Screen, { Card, Note } from '../components/Screen';
import { colors } from '../theme';
export default function LiveScreen() {
  return <Screen><Card><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '700' }}>Live</Text><Note>Built in the next batch. See HANDOFF.md.</Note></Card></Screen>;
}
