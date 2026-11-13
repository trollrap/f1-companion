import React from 'react';
import { View, UIManager, Platform, AppState, Pressable } from 'react-native';
import { HeaderBackButton } from '@react-navigation/elements';
import HomeBtn from './components/HomeBtn';
import Tour from './components/Tour';
import DialogHost from './components/DialogHost';
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
import DriverSeasonsScreen from './screens/DriverSeasonsScreen';
import PredictScreen from './screens/PredictScreen';
import { warmCaches } from './lib/warm';
import { WeekendScreen, LeaderboardScreen, QuizScreen, RecordsScreen } from './screens/ExploreScreens';
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
import { NavBar } from './components/TabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navTheme = { ...DefaultTheme, dark: !colors.isLight, colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, text: colors.fg, border: colors.line, primary: colors.accent } };
const ICONS = { Home: 'home', Calendar: 'calendar', Standings: 'trophy', Paddock: 'people', News: 'newspaper', Fun: 'game-controller' };

const MTab = createBottomTabNavigator();
const MICONS = { Home: 'home', Calendar: 'calendar', Standings: 'trophy', Paddock: 'people' };
function MotoTabs() {
  return (
    <MTab.Navigator tabBar={(p) => <NavBar {...p} icons={MICONS} />} screenOptions={({ route }) => ({
      headerShown: false, animation: 'fade', tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
      
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
    <FTab.Navigator tabBar={(p) => <NavBar {...p} icons={{ Scores: 'football', Tables: 'list' }} />} screenOptions={({ route }) => ({
      headerShown: false, animation: 'fade', tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
      
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
    <Tab.Navigator tabBar={(p) => <NavBar {...p} icons={ICONS} />} screenOptions={({ route }) => ({
      headerShown: false, animation: 'fade', tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
      
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
// Every inner screen has a back arrow (left) and a home button (right): one tap back to the first tab screen instead of going back page after page.
const detail = ({ navigation }) => ({ ...detailBase, headerLeft: (p) => (p.canGoBack ? <HeaderBackButton {...p} tintColor={colors.fg} onPress={() => navigation.goBack()} /> : null), headerRight: () => <HomeBtn /> });

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);
function Shell() {
  // Changing the language rebuilds the navigation tree so every screen and title is drawn again in the new language.
  const { prefs, ready, setOpt } = usePrefs();
  // Coming back to the app after a while (or after a race ended) reloads the short-lived data, so the Home cards are never a stale copy.
  React.useEffect(() => warmCaches(), []);
  React.useEffect(() => {
    let away = 0; const sub = AppState.addEventListener('change', (st) => { if (st !== 'active') away = Date.now(); else if (away && Date.now() - away > 3 * 60000) { away = 0; refreshAll(); } });
    return () => sub.remove();
  }, []);
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!prefs.opts.welcomed) return <WelcomeScreen />;
  return (
          <NavigationContainer key={`${prefs.opts.lang === 'el' ? 'el' : 'en'}-${prefs.opts.sport === 'motogp' ? 'mg' : prefs.opts.sport === 'football' ? 'fb' : 'f1'}`} theme={navTheme}>
            <StatusBar style={colors.isLight ? 'dark' : 'light'} />
            <AlertScheduler />
            <Tour visible={!prefs.opts.tourDone} onClose={() => setOpt('tourDone', true)} />
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
              <Stack.Screen name="TeamCompare" getComponent={() => require('./screens/TeamCompareScreen').default} options={{ title: tr('Team head to head') }} />
              <Stack.Screen name="Rules" getComponent={() => require('./screens/RulesScreen').default} options={{ title: tr('F1 rules') }} />
              <Stack.Screen name="WhatIf" getComponent={() => require('./screens/WhatIfScreen').default} options={{ title: tr('What if') }} />
              <Stack.Screen name="Predict" component={PredictScreen} options={{ title: tr('Predictions') }} />
              <Stack.Screen name="Search" getComponent={() => require('./screens/SearchScreen').default} options={{ title: 'Search' }} />
              <Stack.Screen name="TimeMachine" getComponent={() => require('./screens/TimeMachineScreen').default} options={{ title: 'Time machine' }} />
              <Stack.Screen name="LightsOut" getComponent={() => require('./screens/GameScreens').LightsOutScreen} options={{ title: 'Lights out' }} />
              <Stack.Screen name="GuessCircuit" getComponent={() => require('./screens/GameScreens').GuessCircuitScreen} options={{ title: 'Guess the circuit' }} />
              <Stack.Screen name="MysteryDriver" getComponent={() => require('./screens/GameScreens').MysteryDriverScreen} options={{ title: 'Mystery driver' }} />
              <Stack.Screen name="Cards" getComponent={() => require('./screens/CardScreens').default} options={{ title: 'Driver cards' }} />
              <Stack.Screen name="Dominance" getComponent={() => require('./screens/InsightScreens').DominanceScreen} options={{ title: 'Dominance' }} />
              <Stack.Screen name="TeamTrees" getComponent={() => require('./screens/InsightScreens').TeamTreesScreen} options={{ title: 'Team family trees' }} />
              <Stack.Screen name="Rookies" getComponent={() => require('./screens/InsightScreens').RookieScreen} options={{ title: 'Rookie report' }} />
              <Stack.Screen name="FlagQuiz" getComponent={() => require('./screens/ExtraGames').FlagQuizScreen} options={{ title: 'Flag quiz' }} />
              <Stack.Screen name="YearReview" getComponent={() => require('./screens/ExtraGames').YearReviewScreen} options={{ title: 'Year in review' }} />
              <Stack.Screen name="GridDrops" getComponent={() => require('./screens/GridDropsScreen').default} options={{ title: 'Grid penalties' }} />
              <Stack.Screen name="RadioGame" getComponent={() => require('./screens/RadioGame').RadioGameScreen} options={{ title: 'Team radio' }} />
              <Stack.Screen name="PitStop" getComponent={() => require('./screens/MoreGames').PitStopScreen} options={{ title: 'Pit stop timer' }} />
              <Stack.Screen name="NumberQuiz" getComponent={() => require('./screens/MoreGames').NumberQuizScreen} options={{ title: 'Number quiz' }} />
              <Stack.Screen name="CareerDuel" getComponent={() => require('./screens/MoreGames').CareerDuelScreen} options={{ title: 'Career duel' }} />
              <Stack.Screen name="BuildGrid" getComponent={() => require('./screens/MoreGames').BuildGridScreen} options={{ title: 'Build the grid' }} />
              <Stack.Screen name="Travel" getComponent={() => require('./screens/ExtraStats').TravelScreen} options={{ title: 'Season travel' }} />
              <Stack.Screen name="TitleSwing" getComponent={() => require('./screens/ExtraStats').TitleSwingScreen} options={{ title: 'Title picture' }} />
              <Stack.Screen name="TeamMates" getComponent={() => require('./screens/ExtraStats').TeamMateScreen} options={{ title: 'Team-mate battles' }} />
              <Stack.Screen name="Passing" getComponent={() => require('./screens/SeasonStats').PassingScreen} options={{ title: 'Overtaking by circuit' }} />
              <Stack.Screen name="CompareSeasons" getComponent={() => require('./screens/SeasonStats').CompareSeasonsScreen} options={{ title: 'Compare seasons' }} />
              <Stack.Screen name="TrueFalse" getComponent={() => require('./screens/ExtraGames').TrueFalseScreen} options={{ title: 'True or false' }} />
              <Stack.Screen name="SeasonReview" getComponent={() => require('./screens/ReviewScreens').SeasonReviewScreen} options={{ title: 'Season review' }} />
              <Stack.Screen name="Debuts" getComponent={() => require('./screens/ReviewScreens').DebutsScreen} options={{ title: 'Debuts and farewells' }} />
              <Stack.Screen name="CircuitCompare" getComponent={() => require('./screens/ReviewScreens').CircuitCompareScreen} options={{ title: 'Circuit comparison' }} />
              <Stack.Screen name="WinnerGuess" getComponent={() => require('./screens/MoreGames').WinnerGuessScreen} options={{ title: 'Winner guess' }} />
              <Stack.Screen name="Milestones" getComponent={() => require('./screens/RecordScreens').MilestonesScreen} options={{ title: 'Driver milestones' }} />
              <Stack.Screen name="HomeHeroes" getComponent={() => require('./screens/RecordScreens').HomeHeroesScreen} options={{ title: 'Home-race heroes' }} />
              <Stack.Screen name="PodiumPairs" getComponent={() => require('./screens/RecordScreens').PodiumPairsScreen} options={{ title: 'Podium pairs' }} />
              <Stack.Screen name="Connections" getComponent={() => require('./screens/PuzzleGames').ConnectionsScreen} options={{ title: 'Connections' }} />
              <Stack.Screen name="Hangman" getComponent={() => require('./screens/PuzzleGames').HangmanScreen} options={{ title: 'Hangman' }} />
              <Stack.Screen name="Comebacks" getComponent={() => require('./screens/RecordScreens').ComebacksScreen} options={{ title: 'Biggest comebacks' }} />
              <Stack.Screen name="ClosestNumber" getComponent={() => require('./screens/MoreGames').ClosestNumberScreen} options={{ title: 'Closest number' }} />
              <Stack.Screen name="LapTapper" getComponent={() => require('./screens/MoreGames').LapTapperScreen} options={{ title: 'Lap tapper' }} />
              <Stack.Screen name="Reliability" getComponent={() => require('./screens/ReliabilityScreen').default} options={{ title: 'Reliability' }} />
              <Stack.Screen name="Replay" getComponent={() => require('./screens/ReplayScreen').default} options={{ title: 'Season replay' }} />
              <Stack.Screen name="FanZone" getComponent={() => require('./screens/FanZoneScreen').default} options={{ title: 'Fan zone' }} />
              <Stack.Screen name="Teammates" getComponent={() => require('./screens/TeammatesScreen').default} options={{ title: 'Team-mate battles' }} />
              <Stack.Screen name="RaceDay" getComponent={() => require('./screens/RaceDayScreen').default} options={{ title: 'Race day' }} />
              <Stack.Screen name="Dev" getComponent={() => require('./screens/DevScreen').default} options={{ title: 'Developer menu' }} />
              <Stack.Screen name="Weekend" component={WeekendScreen} options={{ title: 'Race weekend' }} />
              <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
              <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: 'Quiz' }} />
              <Stack.Screen name="Records" component={RecordsScreen} options={{ title: 'Records & history' }} />
              <Stack.Screen name="Chart" getComponent={() => require('./screens/ChartScreen').default} options={{ title: tr('Season chart') }} />
              <Stack.Screen name="Grid" getComponent={() => require('./screens/GridScreen').default} options={{ title: tr('Next season grid') }} />
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
            <DialogHost />
          </TeamsProvider>
          </FavsProvider>
        </SeasonProvider>
      </PrefsProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
