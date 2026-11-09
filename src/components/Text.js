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
// A figure that could not be worked out must never show as "NaN" or "undefined": it becomes a dash.
const clean = (c) => {
  if (typeof c === 'number') return Number.isNaN(c) ? '—' : c;
  if (typeof c === 'string') return c.includes('NaN') ? c.replace(/-?NaN/g, '—') : c;
  if (Array.isArray(c)) return c.map(clean);
  return c;
};
export function Text({ style, ...props }) {
  const { fontFamily, fontWeight, fontStyle, ...rest } = StyleSheet.flatten(style) || {};
  const heavy = Number(fontWeight) >= 800;
  let family; const el = ui.lang === 'el';
  if (el && (!fontFamily || fontFamily === 'label' || fontFamily === 'display')) family = heavy ? 'RobotoCondensed_800ExtraBold' : GR[w(fontWeight)];
  else if (fontFamily === 'label') family = LABEL[w(fontWeight)];
  else if (fontFamily === 'display') family = heavy ? 'Exo2_800ExtraBold' : 'Exo2_700Bold';
  else if (fontStyle === 'italic') family = heavy ? 'Exo2_800ExtraBold_Italic' : 'Exo2_700Bold_Italic';
  else family = fontFamily || BODY[w(fontWeight)];
  // Settings > Font: 'system' uses the phone's normal font (plain, very readable); the text size slider scales every size.
  const sc = ui.scale && ui.scale !== 1 ? ui.scale : 1; const size = rest.fontSize != null ? Math.round(rest.fontSize * sc * 10) / 10 : undefined; const lh = rest.lineHeight != null ? Math.round(rest.lineHeight * sc * 10) / 10 : undefined;
  if (ui.font === 'system' && !fontFamily?.startsWith?.('Rajdhani') && family !== undefined) return <RNText {...props} children={clean(props.children)} style={[rest, { fontSize: size, lineHeight: lh, fontWeight: heavy ? '800' : fontWeight, fontFamily: 'sans-serif', fontStyle: fontStyle === 'italic' ? 'italic' : 'normal' }]} />;
  const kids = clean(el ? trKids(props.children) : props.children);
  return <RNText {...props} children={kids} style={[rest, { fontSize: size, lineHeight: lh, fontFamily: family, fontStyle: 'normal' }]} />;
}
