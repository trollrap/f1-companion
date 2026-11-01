import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from './Text';
import { colors } from '../theme';
// Shows a crash on screen (with the message) instead of leaving a blank or endlessly loading app.
export default class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 70 }}>
        <Text style={{ color: colors.accent, fontSize: 22, fontWeight: '700' }}>Something went wrong</Text>
        <ScrollView style={{ marginTop: 12 }}><Text style={{ color: colors.fg, fontSize: 15 }}>{String(this.state.error?.stack || this.state.error)}</Text></ScrollView>
      </View>
    );
  }
}
