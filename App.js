import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './src/lib/resultAlerts'; // registers the background task: must load with the app, before anything renders
import { applyAccent, applyTheme, colors, teamColor } from './src/theme';
import { readDurable } from './src/lib/durable';
import { loadDev } from './src/lib/dev';

// The saved accent colour is applied before any screen file is loaded, so every style is built with it.
// (Screens are required below, once, after the colour is known; they are not imported at the top of this file.)
export default function App() {
  const [Main, setMain] = useState(null);
  useEffect(() => {
    let on = true;
    Promise.all([AsyncStorage.getItem('prefs'), readDurable('accent'), readDurable('prefs:v2'), AsyncStorage.getItem('favs').catch(() => null)])
      .then(([r, acc, dur, favRaw]) => { let a = acc; try { a = a || (dur && JSON.parse(dur)?.opts?.accent) || (r && JSON.parse(r)?.opts?.accent); } catch {} if (a) applyAccent(a); try { const o = (dur && JSON.parse(dur)?.opts) || (r && JSON.parse(r)?.opts) || {}; if (o.teamTheme && o.teamTheme !== 'off') { const fv = favRaw ? JSON.parse(favRaw) : {}; const id = o.teamTheme === 'fav' ? (fv.teams || [])[0] : o.teamTheme; const tc = id && teamColor(id); if (tc) applyAccent(tc); } } catch {} let th = null; try { th = (dur && JSON.parse(dur)?.opts?.theme) || (r && JSON.parse(r)?.opts?.theme); } catch {} if (th) applyTheme(th); let cb = false; try { cb = !!((dur && JSON.parse(dur)?.opts?.colorblind) || (r && JSON.parse(r)?.opts?.colorblind)); } catch {} if (cb) { colors.good = '#3B9CFF'; colors.red = '#FF9F1C'; } })
      .catch(() => {})
      .then(() => loadDev().catch(() => {}))
      .finally(() => { if (on) setMain(() => require('./src/Main').default); });
    return () => { on = false; };
  }, []);
  return Main ? <Main /> : <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}
