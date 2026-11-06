import React from 'react';
import { View, UIManager, Platform, AppState, Pressable } from 'react-native';
import { HeaderBackButton } from '@react-navigation/elements';
import { refreshAll } from './lib/net';
import { useFonts } from 'expo-font';
import { Rajdhani_400Regular, Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import { ChakraPetch_500Medium, ChakraPetch_600SemiBold, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { Exo2_700Bold, Exo2_800ExtraBold, Exo2_700Bold_Italic, Exo2_800ExtraBold_Italic } from '@expo-google-fonts/exo-2';
import { RobotoCondensed_400Regular, RobotoCondensed_500Medium, RobotoCondensed_600SemiBold, RobotoCondensed_700Bold, RobotoCondensed_800ExtraBold } from '@expo-google-fonts/roboto-condensed';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import './lib/resultAlerts';
import { colors } from './theme';
import { SeasonProvider } from './hooks/useSeason';
import { PrefsProvider, usePrefs } from './hooks/usePrefs';
import { FavsProvider } from './hooks/useFavs';
import { TeamsProvider } from './hooks/useTeams';
import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import StandingsScreen from './screens/StandingsScreen';
import PaddockScreen from './screens/PaddockScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import NewsScreen, { ArticleScreen } from './screens/NewsScreen';
import RaceDetailScreen from './screens/RaceDetailScreen';
import RoundScreen from './screens/RoundScreen';
import CircuitScreen from './screens/CircuitScreen';
import DriverScreen from './screens/DriverScreen';
import TeamScreen from './screens/TeamScreen';
import CompareScreen from './screens/CompareScreen';
import RulesScreen from './screens/RulesScreen';
import DriverSeasonsScreen from './screens/DriverSeasonsScreen';
import WhatIfScreen from './screens/WhatIfScreen';
import PredictScreen from './screens/PredictScreen';
import ChartScreen from './screens/ChartScreen';
import GridScreen from './screens/GridScreen';
import TeamCompareScreen from './screens/TeamCompareScreen';
import { MotoHome, MotoCalendar, MotoStandings, MotoEvent, MotoRider, MotoPaddock, MotoTeam } from './screens/MotoScreens';
import { FootScores, FootTable, FootMatch, FootTeam } from './screens/FootScreens';
import { FunHome, FunProfile } from './screens/FunScreens';
import { FantasyNew, Fantasy, FantasyRace, FantasyDriver, FantasyTransfers, FunSettings, PresetNew, PresetGrid } from './screens/FantasyScreens';
import { FantasyPresets } from './screens/PresetScreens';
import SettingsScreen from './screens/SettingsScreen';
import AlertScheduler from './components/AlertScheduler';
import ErrorBoundary from './components/ErrorBoundary';
import { shortName } from './lib/time';
import { tr } from './lib/i18n';
import { ui } from './lib/motion';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navTheme = { ...DefaultTheme, dark: true, colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, text: colors.fg, border: colors.line, primary: colors.accent } };
const ICONS = { Home: 'home', Calendar: 'calendar', Standings: 'trophy', Paddock: 'people', News: 'newspaper', Fun: 'game-controller' };

const MTab = createBottomTabNavigator();
const MICONS = { Home: 'home', Calendar: 'calendar', Standings: 'trophy', Paddock: 'people' };
function MotoTabs() {
  return (
    <MTab.Navigator screenOptions={({ route }) => ({
      headerShown: false, animation: 'fade', tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line, height: 64, paddingTop: 6, paddingBottom: 8 },
      tabBarLabelStyle: { fontFamily: ui.lang === 'el' ? 'RobotoCondensed_600SemiBold' : 'Rajdhani_600SemiBold', fontSize: 13 },
      tabBarLabel: tr(route.name), tabBarIcon: ({ color, size }) => <Ionicons name={MICONS[route.name]} size={size} color={color} />,
    })}>
      <MTab.Screen name="Home" component={MotoHome} />
      <MTab.Screen name="Calendar" component={MotoCalendar} />
      <MTab.Screen name="Standings" component={MotoStandings} />
      <MTab.Screen name="Paddock" component={MotoPaddock} />
    </MTab.Navigator>
  );
}
const FTab = createBottomTabNavigator();
function FootTabs() {
  return (
    <FTab.Navigator screenOptions={({ route }) => ({
      headerShown: false, animation: 'fade', tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line, height: 64, paddingTop: 6, paddingBottom: 8 },
      tabBarLabelStyle: { fontFamily: ui.lang === 'el' ? 'RobotoCondensed_600SemiBold' : 'Rajdhani_600SemiBold', fontSize: 13 },
      tabBarLabel: tr(route.name), tabBarIcon: ({ color, size }) => <Ionicons name={route.name === 'Scores' ? 'football' : 'list'} size={size} color={color} />,
    })}>
      <FTab.Screen name="Scores" component={FootScores} />
      <FTab.Screen name="Tables" component={FootTable} />
    </FTab.Navigator>
  );
}
function Tabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false, animation: 'fade', tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line, height: 64, paddingTop: 6, paddingBottom: 8 },
      tabBarLabelStyle: { fontFamily: ui.lang === 'el' ? 'RobotoCondensed_600SemiBold' : 'Rajdhani_600SemiBold', fontSize: 13 },
      tabBarLabel: tr(route.name),
      tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name]} size={size} color={color} />,
    })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Standings" component={StandingsScreen} />
      <Tab.Screen name="Paddock" component={PaddockScreen} />
      <Tab.Screen name="News" component={NewsScreen} />
      <Tab.Screen name="Fun" component={FunHome} />
    </Tab.Navigator>
  );
}
const detailBase = { headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.fg, headerShadowVisible: false, animation: 'slide_from_right', animationDuration: 280, contentStyle: { backgroundColor: colors.bg }, get headerTitleStyle() { return { fontFamily: ui.lang === 'el' ? 'RobotoCondensed_600SemiBold' : 'ChakraPetch_600SemiBold', fontSize: 16 }; }, headerBackButtonDisplayMode: 'minimal' };
// Every inner screen has a back arrow and a home button: one tap back to the first tab screen instead of going back page after page.
const detail = ({ navigation }) => ({ ...detailBase, headerLeft: (p) => (p.canGoBack ? (<View style={{ flexDirection: 'row', alignItems: 'center' }}><HeaderBackButton {...p} tintColor={colors.fg} onPress={() => navigation.goBack()} /><Pressable onPress={() => navigation.popToTop()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Home" style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}><Ionicons name="home" size={20} color={colors.fg} /></Pressable></View>) : null) });

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);
function Shell() {
  // Changing the language rebuilds the navigation tree so every screen and title is drawn again in the new language.
  const { prefs, ready } = usePrefs();
  // Coming back to the app after a while (or after a race ended) reloads the short-lived data, so the Home cards are never a stale copy.
  React.useEffect(() => {
    let away = 0; const sub = AppState.addEventListener('change', (st) => { if (st !== 'active') away = Date.now(); else if (away && Date.now() - away > 3 * 60000) { away = 0; refreshAll(); } });
    return () => sub.remove();
  }, []);
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!prefs.opts.welcomed) return <WelcomeScreen />;
  return (
          <NavigationContainer key={`${prefs.opts.lang === 'el' ? 'el' : 'en'}-${prefs.opts.sport === 'motogp' ? 'mg' : prefs.opts.sport === 'football' ? 'fb' : 'f1'}`} theme={navTheme}>
            <StatusBar style="light" />
            <AlertScheduler />
            {prefs.opts.sport === 'football' ? (
              <Stack.Navigator screenOptions={detail}>
                <Stack.Screen name="Tabs" component={FootTabs} options={{ headerShown: false }} />
                <Stack.Screen name="FootMatch" component={FootMatch} options={{ title: tr('Match') }} />
                <Stack.Screen name="FootTeam" component={FootTeam} options={({ route }) => ({ title: route.params.name })} />
                <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: tr('Settings') }} />
              </Stack.Navigator>
            ) : prefs.opts.sport === 'motogp' ? (
              <Stack.Navigator screenOptions={detail}>
                <Stack.Screen name="Tabs" component={MotoTabs} options={{ headerShown: false }} />
                <Stack.Screen name="MotoEvent" component={MotoEvent} options={({ route }) => ({ title: route.params.event.short || route.params.event.name })} />
                <Stack.Screen name="MotoTeam" component={MotoTeam} options={({ route }) => ({ title: route.params.name })} />
                <Stack.Screen name="MotoRider" component={MotoRider} options={({ route }) => ({ title: route.params.rider.name })} />
                <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: tr('Settings') }} />
              </Stack.Navigator>
            ) : (
              <Stack.Navigator screenOptions={detail}>
              <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
              <Stack.Screen name="RaceDetail" component={RaceDetailScreen} options={({ route }) => ({ title: tr(shortName(route.params.meeting.meeting_name)) })} />
              <Stack.Screen name="Round" component={RoundScreen} options={({ route }) => ({ title: tr(`Round ${route.params.meeting.round}`) })} />
              <Stack.Screen name="Circuit" component={CircuitScreen} />
              <Stack.Screen name="Driver" component={DriverScreen} options={({ route }) => ({ title: route.params.name })} />
              <Stack.Screen name="Team" component={TeamScreen} options={({ route }) => ({ title: route.params.name })} />
              <Stack.Screen name="DriverSeasons" component={DriverSeasonsScreen} options={({ route }) => ({ title: ui.lang === 'el' ? `${route.params.name} · σεζόν` : `${route.params.name} seasons` })} />
              <Stack.Screen name="Compare" component={CompareScreen} options={{ title: tr('Head to head') }} />
              <Stack.Screen name="TeamCompare" component={TeamCompareScreen} options={{ title: tr('Team head to head') }} />
              <Stack.Screen name="Rules" component={RulesScreen} options={{ title: tr('F1 rules') }} />
              <Stack.Screen name="WhatIf" component={WhatIfScreen} options={{ title: tr('What if') }} />
              <Stack.Screen name="Predict" component={PredictScreen} options={{ title: tr('Predictions') }} />
              <Stack.Screen name="Chart" component={ChartScreen} options={{ title: tr('Season chart') }} />
              <Stack.Screen name="Grid" component={GridScreen} options={{ title: tr('Next season grid') }} />
              <Stack.Screen name="FunProfile" component={FunProfile} options={{ title: 'Your driver' }} />
              <Stack.Screen name="FunSettings" component={FunSettings} options={{ title: 'Fantasy settings' }} />
              <Stack.Screen name="FantasyNew" component={FantasyNew} options={{ title: 'New fantasy season' }} />
              <Stack.Screen name="FantasyPresets" component={FantasyPresets} options={{ title: 'Presets' }} />
              <Stack.Screen name="PresetNew" component={PresetNew} options={{ title: 'New grid preset' }} />
              <Stack.Screen name="PresetGrid" component={PresetGrid} options={{ title: 'Grid preset' }} />
              <Stack.Screen name="Fantasy" component={Fantasy} options={{ title: 'Fantasy' }} />
              <Stack.Screen name="FantasyRace" component={FantasyRace} options={({ route }) => ({ title: 'Race result' })} />
              <Stack.Screen name="FantasyDriver" component={FantasyDriver} options={{ title: 'Driver' }} />
              <Stack.Screen name="FantasyTransfers" component={FantasyTransfers} options={{ title: 'Transfers' }} />
              <Stack.Screen name="Article" component={ArticleScreen} options={{ title: tr('News') }} />
              <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: tr('Settings') }} />
              </Stack.Navigator>
            )}
          </NavigationContainer>
  );
}
export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Rajdhani_400Regular, Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold, ChakraPetch_500Medium, ChakraPetch_600SemiBold, ChakraPetch_700Bold, Exo2_700Bold, Exo2_800ExtraBold, Exo2_700Bold_Italic, Exo2_800ExtraBold_Italic, RobotoCondensed_400Regular, RobotoCondensed_500Medium, RobotoCondensed_600SemiBold, RobotoCondensed_700Bold, RobotoCondensed_800ExtraBold });
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.bg }} />; // brief blank while fonts load; a font error falls back to system fonts
  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <PrefsProvider>
        <SeasonProvider>
          <FavsProvider>
          <TeamsProvider>
            <Shell />
          </TeamsProvider>
          </FavsProvider>
        </SeasonProvider>
      </PrefsProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
