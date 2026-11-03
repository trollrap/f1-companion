import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './src/lib/resultAlerts'; // registers the background task: must load with the app, before anything renders
import { applyAccent, colors } from './src/theme';

// The saved accent colour is applied before any screen file is loaded, so every style is built with it.
// (Screens are required below, once, after the colour is known; they are not imported at the top of this file.)
export default function App() {
  const [Main, setMain] = useState(null);
  useEffect(() => {
    let on = true;
    Promise.all([AsyncStorage.getItem('prefs'), AsyncStorage.getItem('accent')])
      .then(([r, acc]) => { let a = acc; try { a = a || (r && JSON.parse(r)?.opts?.accent); } catch {} if (a) applyAccent(a); })
      .catch(() => {})
      .finally(() => { if (on) setMain(() => require('./src/Main').default); });
    return () => { on = false; };
  }, []);
  return Main ? <Main /> : <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}
