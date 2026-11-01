import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { trKids } from '../lib/i18n';
import { ui } from '../lib/motion';
// Maps fontWeight/fontStyle to the loaded font files (custom fonts need an exact family per weight).
// fontFamily: 'label' -> Chakra Petch (small caps-style labels), 'display' -> Exo 2 (big numbers). Default is Rajdhani.
const BODY = { 400: 'Rajdhani_400Regular', 500: 'Rajdhani_500Medium', 600: 'Rajdhani_600SemiBold', 700: 'Rajdhani_700Bold' };
const LABEL = { 400: 'ChakraPetch_500Medium', 500: 'ChakraPetch_500Medium', 600: 'ChakraPetch_600SemiBold', 700: 'ChakraPetch_700Bold' };
// Greek uses Roboto Condensed (the Latin fonts above have no Greek letters).
const GR = { 400: 'RobotoCondensed_400Regular', 500: 'RobotoCondensed_500Medium', 600: 'RobotoCondensed_600SemiBold', 700: 'RobotoCondensed_700Bold' };
const w = (v) => { if (!v || v === 'normal') return 400; if (v === 'bold') return 700; const n = Number(v); return n >= 700 ? 700 : n >= 600 ? 600 : n >= 500 ? 500 : 400; };
export function Text({ style, ...props }) {
  const { fontFamily, fontWeight, fontStyle, ...rest } = StyleSheet.flatten(style) || {};
  const heavy = Number(fontWeight) >= 800;
  let family; const el = ui.lang === 'el';
  if (el && (!fontFamily || fontFamily === 'label' || fontFamily === 'display')) family = heavy ? 'RobotoCondensed_800ExtraBold' : GR[w(fontWeight)];
  else if (fontFamily === 'label') family = LABEL[w(fontWeight)];
  else if (fontFamily === 'display') family = heavy ? 'Exo2_800ExtraBold' : 'Exo2_700Bold';
  else if (fontStyle === 'italic') family = heavy ? 'Exo2_800ExtraBold_Italic' : 'Exo2_700Bold_Italic';
  else family = fontFamily || BODY[w(fontWeight)];
  const kids = el ? trKids(props.children) : props.children;
  return <RNText {...props} children={kids} style={[rest, { fontFamily: family, fontStyle: 'normal' }]} />;
}
