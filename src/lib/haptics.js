import { Vibration } from 'react-native';
// Gentle vibration for key moments. Uses React Native's own Vibration, so it needs no extra package. The master switch is Settings > Haptics.
let on = true; export const setHaptics = (v) => { on = v !== false; };
const go = (p) => { if (!on) return; try { Vibration.vibrate(p); } catch {} };
export const tap = () => go(8);
export const good = () => go([0, 14, 40, 14]);
export const bad = () => go(45);
export const big = () => go([0, 20, 60, 20, 60, 40]);
