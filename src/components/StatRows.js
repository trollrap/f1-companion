import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import Grad from './Grad';
import Reveal from './Reveal';
import Press from './Press';
import { NavigationContext } from '@react-navigation/native';
import { entityByName } from '../api/history';
import { colors, alpha } from '../theme';

// Header for a statistics screen: a tinted panel with an icon, a title and a short note.
export function StatHeader({ title, icon = 'stats-chart', note, color = colors.accent }) {
  return (
    <Grad color={color} from={0.4} to={0.05} border={0.4} radius={20} style={{ padding: 14 }}>
      <Ionicons name={icon} size={104} color={alpha(color, 0.14)} style={{ position: 'absolute', right: -10, top: -12 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: alpha(color, 0.3), alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={20} color={colors.fg} /></View>
        <Text style={{ flex: 1, color: colors.fg, fontSize: 22, fontWeight: '800', fontStyle: 'italic' }} numberOfLines={1}>{title}</Text>
      </View>
      {note ? <Text style={{ color: colors.onSoft, fontSize: 13, lineHeight: 18, marginTop: 8 }}>{note}</Text> : null}
    </Grad>);
}
const MEDAL = ['#f5c400', '#c9ced8', '#cd7f32'];
// One ranked line: a badge (rank or year), a name with a second line, a value, and an optional bar showing the value against the best.
export function StatRow({ i = 0, badge, medal, title, sub, value, frac, color = colors.accent, to, onPress }) {
  const m = medal && i < 3 ? MEDAL[i] : null; const nav = React.useContext(NavigationContext);
  // A row whose title (or `to`) is a driver or a team opens that page; `onPress` overrides.
  let ent = null; if (!onPress && to !== false && nav && typeof (to || title) === 'string') { try { ent = entityByName(to || title); } catch {} }
  const go = onPress || (ent ? () => nav.navigate(ent.type === 'driver' ? 'Driver' : 'Team', ent.type === 'driver' ? { driverId: ent.driverId, name: ent.name, first: ent.first, last: ent.last } : { teamId: ent.teamId, name: ent.name }) : null);
  const Wrap = go ? Press : React.Fragment; const wp = go ? { onPress: go, scale: 0.985, accessibilityLabel: `${title}${sub ? `, ${sub}` : ''}. Open` } : {};
  return (
    <Reveal index={Math.min(i, 8)}>
      <Wrap {...wp}><View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: m ? alpha(m, 0.45) : colors.line, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ minWidth: 38, height: 28, paddingHorizontal: 6, borderRadius: 9, backgroundColor: m ? alpha(m, 0.25) : alpha(colors.fg, 0.08), alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: m || colors.onSoft, fontSize: 13, fontWeight: '800' }}>{badge}</Text></View>
          <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 15, fontWeight: '800' }} numberOfLines={1}>{title}</Text>{sub ? <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{sub}</Text> : null}</View>
          {value !== undefined && value !== '' ? <Text style={{ color: m || colors.fg, fontSize: 16, fontWeight: '800' }}>{value}</Text> : null}
          {go ? <Ionicons name="chevron-forward" size={15} color={colors.muted} /> : null}
        </View>
        {typeof frac === 'number' ? <View style={{ height: 4, borderRadius: 2, backgroundColor: alpha(colors.fg, 0.08), overflow: 'hidden' }}><View style={{ width: `${Math.max(3, Math.min(100, frac * 100))}%`, height: 4, borderRadius: 2, backgroundColor: m || color }} /></View> : null}
      </View></Wrap>
    </Reveal>);
}
export const StatList = ({ children }) => <View style={{ gap: 8 }}>{children}</View>;
export const SectionLabel = ({ children, color = colors.accent }) => (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}><View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: color }} /><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '800' }}>{children}</Text></View>);
