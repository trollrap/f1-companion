import React from 'react';
import { View, UIManager, Platform } from 'react-native';
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
import './src/lib/resultAlerts';
import { colors } from './src/theme';
import { SeasonProvider } from './src/hooks/useSeason';
import { PrefsProvider, usePrefs } from './src/hooks/usePrefs';
import { FavsProvider } from './src/hooks/useFavs';
import { TeamsProvider } from './src/hooks/useTeams';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import StandingsScreen from './src/screens/StandingsScreen';
import PaddockScreen from './src/screens/PaddockScreen';
import RaceDetailScreen from './src/screens/RaceDetailScreen';
import RoundScreen from './src/screens/RoundScreen';
import CircuitScreen from './src/screens/CircuitScreen';
import DriverScreen from './src/screens/DriverScreen';
import TeamScreen from './src/screens/TeamScreen';
import CompareScreen from './src/screens/CompareScreen';
import RulesScreen from './src/screens/RulesScreen';
import DriverSeasonsScreen from './src/screens/DriverSeasonsScreen';
import WhatIfScreen from './src/screens/WhatIfScreen';
import PredictScreen from './src/screens/PredictScreen';
import ChartScreen from './src/screens/ChartScreen';
import GridScreen from './src/screens/GridScreen';
import TeamCompareScreen from './src/screens/TeamCompareScreen';
import { MotoHome, MotoCalendar, MotoStandings, MotoEvent, MotoRider } from './src/screens/MotoScreens';
import SettingsScreen from './src/screens/SettingsScreen';
import AlertScheduler from './src/components/AlertScheduler';
import ErrorBoundary from './src/components/ErrorBoundary';
import { shortName } from './src/lib/time';
import { tr } from './src/lib/i18n';
import { ui } from './src/lib/motion';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navTheme = { ...DefaultTheme, dark: true, colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, text: colors.fg, border: colors.line, primary: colors.accent } };
const ICONS = { Home: 'home', Calendar: 'calendar', Standings: 'trophy', Paddock: 'people' };

const MTab = createBottomTabNavigator();
const MICONS = { Home: 'home', Calendar: 'calendar', Standings: 'trophy' };
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
    </MTab.Navigator>
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
    </Tab.Navigator>
  );
}
const detail = { headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.fg, headerShadowVisible: false, animation: 'slide_from_right', animationDuration: 280, contentStyle: { backgroundColor: colors.bg }, get headerTitleStyle() { return { fontFamily: ui.lang === 'el' ? 'RobotoCondensed_600SemiBold' : 'ChakraPetch_600SemiBold', fontSize: 16 }; }, headerBackButtonDisplayMode: 'minimal' };

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);
function Shell() {
  // Changing the language rebuilds the navigation tree so every screen and title is drawn again in the new language.
  const { prefs } = usePrefs();
  return (
          <NavigationContainer key={`${prefs.opts.lang === 'el' ? 'el' : 'en'}-${prefs.opts.sport === 'motogp' ? 'mg' : 'f1'}`} theme={navTheme}>
            <StatusBar style="light" />
            <AlertScheduler />
            {prefs.opts.sport === 'motogp' ? (
              <Stack.Navigator screenOptions={detail}>
                <Stack.Screen name="Tabs" component={MotoTabs} options={{ headerShown: false }} />
                <Stack.Screen name="MotoEvent" component={MotoEvent} options={({ route }) => ({ title: route.params.event.short || route.params.event.name })} />
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
