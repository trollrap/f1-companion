import React from 'react';
import { View, UIManager, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { Rajdhani_400Regular, Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import { ChakraPetch_500Medium, ChakraPetch_600SemiBold, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { Exo2_700Bold, Exo2_800ExtraBold, Exo2_700Bold_Italic, Exo2_800ExtraBold_Italic } from '@expo-google-fonts/exo-2';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import './src/lib/resultAlerts';
import { colors } from './src/theme';
import { SeasonProvider } from './src/hooks/useSeason';
import { PrefsProvider } from './src/hooks/usePrefs';
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
import SettingsScreen from './src/screens/SettingsScreen';
import AlertScheduler from './src/components/AlertScheduler';
import ErrorBoundary from './src/components/ErrorBoundary';
import { shortName } from './src/lib/time';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navTheme = { ...DefaultTheme, dark: true, colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, text: colors.fg, border: colors.line, primary: colors.accent } };
const ICONS = { Home: 'home', Calendar: 'calendar', Standings: 'trophy', Paddock: 'people' };

function Tabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false, animation: 'fade', tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line, height: 64, paddingTop: 6, paddingBottom: 8 },
      tabBarLabelStyle: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13 },
      tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name]} size={size} color={color} />,
    })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Standings" component={StandingsScreen} />
      <Tab.Screen name="Paddock" component={PaddockScreen} />
    </Tab.Navigator>
  );
}
const detail = { headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.fg, headerShadowVisible: false, animation: 'slide_from_right', animationDuration: 280, contentStyle: { backgroundColor: colors.bg }, headerTitleStyle: { fontFamily: 'ChakraPetch_600SemiBold', fontSize: 16 }, headerBackButtonDisplayMode: 'minimal' };

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);
export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Rajdhani_400Regular, Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold, ChakraPetch_500Medium, ChakraPetch_600SemiBold, ChakraPetch_700Bold, Exo2_700Bold, Exo2_800ExtraBold, Exo2_700Bold_Italic, Exo2_800ExtraBold_Italic });
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.bg }} />; // brief blank while fonts load; a font error falls back to system fonts
  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <PrefsProvider>
        <SeasonProvider>
          <FavsProvider>
          <TeamsProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="light" />
            <AlertScheduler />
            <Stack.Navigator screenOptions={detail}>
              <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
              <Stack.Screen name="RaceDetail" component={RaceDetailScreen} options={({ route }) => ({ title: shortName(route.params.meeting.meeting_name) })} />
              <Stack.Screen name="Round" component={RoundScreen} options={({ route }) => ({ title: `Round ${route.params.meeting.round}` })} />
              <Stack.Screen name="Circuit" component={CircuitScreen} />
              <Stack.Screen name="Driver" component={DriverScreen} options={({ route }) => ({ title: route.params.name })} />
              <Stack.Screen name="Team" component={TeamScreen} options={({ route }) => ({ title: route.params.name })} />
              <Stack.Screen name="DriverSeasons" component={DriverSeasonsScreen} options={({ route }) => ({ title: `${route.params.name} seasons` })} />
              <Stack.Screen name="Compare" component={CompareScreen} options={{ title: 'Head to head' }} />
              <Stack.Screen name="Rules" component={RulesScreen} options={{ title: 'F1 rules' }} />
              <Stack.Screen name="WhatIf" component={WhatIfScreen} options={{ title: 'What if' }} />
              <Stack.Screen name="Predict" component={PredictScreen} options={{ title: 'Predictions' }} />
              <Stack.Screen name="Chart" component={ChartScreen} options={{ title: 'Season chart' }} />
              <Stack.Screen name="Grid" component={GridScreen} options={{ title: 'Next season grid' }} />
              <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            </Stack.Navigator>
          </NavigationContainer>
          </TeamsProvider>
          </FavsProvider>
        </SeasonProvider>
      </PrefsProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
