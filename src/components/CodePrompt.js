import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, TextInput } from 'react-native';
import { Text } from './Text';
import { colors } from '../theme';
// A small themed popup with one text box, used for the secret code.
export default function CodePrompt({ visible, title, onSubmit, onClose }) {
  const [v, setV] = useState(''); const [bad, setBad] = useState(false);
  useEffect(() => { if (visible) { setV(''); setBad(false); } }, [visible]);
  if (!visible) return null;
  const go = () => { const ok = onSubmit(v.trim()); if (ok === false) setBad(true); };
  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.66)', justifyContent: 'center', padding: 24 }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
        <View style={{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 22, padding: 20 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginBottom: 14 }} />
          <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '700' }}>{title}</Text>
          <TextInput value={v} onChangeText={(x) => { setV(x); setBad(false); }} autoFocus autoCapitalize="none" autoCorrect={false} secureTextEntry onSubmitEditing={go} placeholder="Code" placeholderTextColor={colors.muted}
            style={{ marginTop: 14, height: 50, borderRadius: 14, paddingHorizontal: 14, color: colors.fg, fontSize: 18, backgroundColor: colors.surface2, borderWidth: 1, borderColor: bad ? colors.red : colors.line }} />
          {bad ? <Text style={{ color: colors.red, marginTop: 8 }}>That is not the code.</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Pressable onPress={onClose} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.muted, fontSize: 17, fontWeight: '700' }}>Cancel</Text></Pressable>
            <Pressable onPress={go} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }, pressed && { opacity: 0.8 }]}><Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Open</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
CodePrompt.ghost = true;
