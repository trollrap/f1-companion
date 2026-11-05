import React, { useEffect, useRef } from 'react';
import { View, Modal, Animated, Easing, ScrollView, Pressable, Image, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Avatar } from './FunBits';
import Grad from './Grad';
import { colors, alpha } from '../theme';

// Full-screen moments: the transfer window, the champion, a qualifying or race result. Everything fades and slides in one after the other.
function Pop({ i = 0, step = 380, children, from = 24, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 420, delay: i * step, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }, style]}>{children}</Animated.View>;
}
const Logo = ({ src, color, label, size = 30 }) => (src ? <Image source={src} resizeMode="contain" style={{ width: size, height: size }} /> : <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: alpha(color || colors.muted, 0.5), alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.fg, fontSize: size * 0.4, fontWeight: '800' }}>{String(label || '').slice(0, 2)}</Text></View>);

function Shell({ visible, title, sub, onClose, children, cta = 'Continue', glow = colors.accent }) {
  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: colors.deep }}>
        <Grad color={glow} from={0.35} to={0} radius={0} border={0} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 320 }} />
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 }}>
          <Pop><Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'label', fontSize: 12, letterSpacing: 3 }}>{String(sub || '').toUpperCase()}</Text><Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800', fontStyle: 'italic', marginTop: 4 }}>{title}</Text></Pop>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 10 }}>{children}</ScrollView>
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 28 }}>
          <Pressable onPress={onClose} style={({ pressed }) => [{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }, pressed && { opacity: 0.8 }]}><Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{cta}</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

// items: [{ kind, who:{...}, photo (source), from:{name,color,logo}, to:{...}, text }]
export function TransferShow({ visible, season, items, onClose }) {
  const list = items || [];
  return (
    <Shell visible={visible} sub={`Season ${season}`} title="Transfer window" onClose={onClose} cta="Continue">
      {!list.length ? <Pop i={1}><Text style={{ color: colors.muted, fontSize: 17 }}>A quiet winter: nobody moved.</Text></Pop> : null}
      {list.map((x, i) => {
        const retire = x.kind === 'retire', rookie = x.kind === 'rookie'; const col = x.to?.color || x.from?.color || colors.muted;
        return (
          <Pop key={i} i={i + 1} step={420}>
            <Grad color={retire ? colors.muted : col} from={0.4} to={0.05} dir="h" radius={18} border={0.4} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar source={x.photo} color={col} label={x.who?.number} size={54} radius={27} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.fg, fontSize: 19, fontWeight: '800' }} numberOfLines={1}>{x.who?.last || x.who?.name}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }} numberOfLines={2}>{retire ? 'Retires from racing' : rookie ? `Debut · from ${x.origin === 'Other series' ? 'another series' : x.origin}` : x.step ? 'Steps up' : 'Moves'}</Text>
              </View>
              {retire ? <Text style={{ fontSize: 26 }}>🏁</Text> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {x.from ? <Logo src={x.from.logo} color={x.from.color} label={x.from.name} /> : <Text style={{ fontSize: 22 }}>🌱</Text>}
                  <Ionicons name="arrow-forward" size={18} color={colors.fg} />
                  <Logo src={x.to?.logo} color={x.to?.color} label={x.to?.name} size={38} />
                </View>)}
            </Grad>
          </Pop>);
      })}
    </Shell>
  );
}

export function ChampionShow({ visible, season, driver, photo, team, teamLogo, teamChamp, teamChampLogo, points, wins, onClose }) {
  const s = useRef(new Animated.Value(0)).current; const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (visible) { s.setValue(0); Animated.spring(s, { toValue: 1, friction: 5, tension: 60, delay: 300, useNativeDriver: true }).start(); Animated.loop(Animated.sequence([Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.timing(spin, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true })])).start(); } }, [visible]);
  const col = team?.color || colors.gold;
  return (
    <Shell visible={visible} sub={`Season ${season}`} title="World champion" onClose={onClose} cta="Awesome" glow={colors.gold}>
      <View style={{ alignItems: 'center', gap: 14, paddingTop: 10 }}>
        <Animated.View style={{ transform: [{ scale: s }, { translateY: spin.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }}>
          <View style={{ padding: 6, borderRadius: 100, borderWidth: 3, borderColor: colors.gold }}><Avatar source={photo} color={col} label={driver?.number} size={190} radius={95} /></View>
        </Animated.View>
        <Pop i={2}><Text style={{ fontSize: 44 }}>🏆</Text></Pop>
        <Pop i={3}><Text style={{ color: colors.fg, fontSize: 34, fontWeight: '800', fontStyle: 'italic', textAlign: 'center' }}>{driver?.last || driver?.name}</Text><Text style={{ color: colors.muted, fontSize: 16, textAlign: 'center' }}>{`${driver?.first || ''}`}</Text></Pop>
        <Pop i={4}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Logo src={teamLogo} color={col} label={team?.name} size={34} /><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '700' }}>{team?.name}</Text></View><Text style={{ color: colors.muted, fontSize: 16, textAlign: 'center', marginTop: 6 }}>{`${points} points · ${wins} wins`}</Text></Pop>
        {teamChamp ? <Pop i={6}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: alpha(teamChamp.color || colors.muted, 0.25) }}><Logo src={teamChampLogo} color={teamChamp.color} label={teamChamp.name} size={30} /><Text style={{ color: colors.fg, fontSize: 16, fontWeight: '700' }}>{`Constructors' champions: ${teamChamp.name}`}</Text></View></Pop> : null}
      </View>
    </Shell>
  );
}

// rows: [{ key, pos, name, photo, logo, color, right }] shown from the back of the field to the front
export function SessionShow({ visible, title, sub, rows, onClose }) {
  const list = (rows || []).slice(0, 22);
  return (
    <Shell visible={visible} sub={sub} title={title} onClose={onClose} cta="Close">
      {list.map((r, idx) => (
        <Pop key={r.key} i={list.length - 1 - idx} step={r.pos <= 3 ? 90 : 110} from={30}>
          <Grad color={r.color} from={r.pos <= 3 ? 0.55 : 0.28} to={0.04} dir="h" radius={14} border={r.pos === 1 ? 0.9 : 0.3} style={[{ paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }, r.pos === 1 && { borderColor: colors.gold }]}>
            <Text style={{ width: 30, color: r.pos === 1 ? colors.gold : colors.fg, fontSize: 18, fontWeight: '800', textAlign: 'center' }}>{r.pos}</Text>
            <Avatar source={r.photo} color={r.color} label={r.code} size={36} radius={18} />
            <Text style={{ flex: 1, color: colors.fg, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{r.name}</Text>
            {r.logo ? <Image source={r.logo} resizeMode="contain" style={{ width: 22, height: 22 }} /> : null}
            <Text style={{ color: colors.fg, fontSize: 14, minWidth: 70, textAlign: 'right' }} numberOfLines={1}>{r.right}</Text>
          </Grad>
        </Pop>))}
    </Shell>
  );
}
