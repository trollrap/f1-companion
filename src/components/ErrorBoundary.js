import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from './Text';
import { colors } from '../theme';
import { logCrash, crumb } from '../lib/crashlog';
// Shows a crash on screen (with the message) instead of leaving a blank or endlessly loading app.
export default class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { logCrash(error, 'app'); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 70 }}>
        <Text style={{ color: colors.accentText, fontSize: 22, fontWeight: '700' }}>Something went wrong</Text>
        <ScrollView style={{ marginTop: 12 }}><Text style={{ color: colors.fg, fontSize: 15 }}>{String(this.state.error?.stack || this.state.error)}</Text></ScrollView>
      </View>
    );
  }
}

// One screen failing must not take the whole app down: the error stays on that screen, with a way to retry or go back.
class Guard extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { logCrash(error, this.props.name || 'screen'); }
  render() {
    if (!this.state.error) return this.props.children;
    const nav = this.props.navigation; const msg = String(this.state.error?.message || this.state.error).slice(0, 400);
    const Btn = ({ label, onPress, solid }) => (<Pressable accessibilityRole="button" onPress={onPress} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, backgroundColor: solid ? colors.accent : colors.card, borderWidth: 1, borderColor: solid ? colors.accent : colors.line }}><Text style={{ color: colors.fg, fontWeight: '800' }}>{label}</Text></Pressable>);
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20, justifyContent: 'center', gap: 14 }}>
        <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>This screen hit a problem</Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>The rest of the app is fine. The details are saved in Settings, Crash log.</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={6}>{msg}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn solid label="Try again" onPress={() => this.setState({ error: null })} />
          <Btn label="Go back" onPress={() => { try { if (nav?.canGoBack?.()) nav.goBack(); else nav?.navigate?.('Tabs'); } catch {} }} />
        </View>
      </View>);
  }
}
const wrapped = new Map();
// Wraps a screen component once, so React Navigation keeps the same component between renders.
export function guardScreen(C, name) {
  if (!C) return C; if (wrapped.has(C)) return wrapped.get(C);
  const W = (p) => { React.useEffect(() => { crumb(name || 'screen'); }, []); return <Guard navigation={p.navigation} name={name}><C {...p} /></Guard>; }; W.displayName = `Guarded(${C.displayName || C.name || name || 'Screen'})`;
  wrapped.set(C, W); return W;
}
