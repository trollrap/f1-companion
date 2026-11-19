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
import { FunHome, FunProfile } from './screens/FunScreens';
import SettingsScreen from './screens/SettingsScreen';
import AlertScheduler from './components/AlertScheduler';
import { navRef } from './lib/navRef';
import ErrorBoundary, { guardScreen } from './components/ErrorBoundary';
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
      <MTab.Screen name="Home" getComponent={() => guardScreen(require('./screens/MotoScreens').MotoHome, 'MotoHome')} />
      <MTab.Screen name="Calendar" getComponent={() => guardScreen(require('./screens/MotoScreens').MotoCalendar, 'MotoCalendar')} />
      <MTab.Screen name="Standings" getComponent={() => guardScreen(require('./screens/MotoScreens').MotoStandings, 'MotoStandings')} />
      <MTab.Screen name="Paddock" getComponent={() => guardScreen(require('./screens/MotoScreens').MotoPaddock, 'MotoPaddock')} />
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
      <FTab.Screen name="Scores" getComponent={() => guardScreen(require('./screens/FootScreens').FootScores, 'FootScores')} />
      <FTab.Screen name="Tables" getComponent={() => guardScreen(require('./screens/FootScreens').FootTable, 'FootTable')} />
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
      <Tab.Screen name="Home" component={guardScreen(HomeScreen, 'HomeScreen')} />
      <Tab.Screen name="Calendar" component={guardScreen(CalendarScreen, 'CalendarScreen')} />
      <Tab.Screen name="Standings" component={guardScreen(StandingsScreen, 'StandingsScreen')} />
      <Tab.Screen name="Paddock" component={guardScreen(PaddockScreen, 'PaddockScreen')} />
      <Tab.Screen name="News" component={guardScreen(NewsScreen, 'NewsScreen')} />
      <Tab.Screen name="Fun" component={guardScreen(FunHome, 'FunHome')} />
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
          <NavigationContainer ref={navRef} key={`${prefs.opts.lang === 'el' ? 'el' : 'en'}-${prefs.opts.sport === 'motogp' ? 'mg' : prefs.opts.sport === 'football' ? 'fb' : 'f1'}`} theme={navTheme}>
            <StatusBar style={colors.isLight ? 'dark' : 'light'} />
            <AlertScheduler />
            <Tour visible={!prefs.opts.tourDone} onClose={() => setOpt('tourDone', true)} />
            {prefs.opts.sport === 'football' ? (
              <Stack.Navigator screenOptions={detail}>
                <Stack.Screen name="Tabs" component={FootTabs} options={{ headerShown: false }} />
                <Stack.Screen name="FootMatch" getComponent={() => guardScreen(require('./screens/FootScreens').FootMatch, 'FootMatch')} options={{ title: tr('Match') }} />
                <Stack.Screen name="FootTeam" getComponent={() => guardScreen(require('./screens/FootScreens').FootTeam, 'FootTeam')} options={({ route }) => ({ title: route.params.name })} />
                <Stack.Screen name="Settings" component={guardScreen(SettingsScreen, 'SettingsScreen')} options={{ title: tr('Settings') }} />
              </Stack.Navigator>
            ) : prefs.opts.sport === 'motogp' ? (
              <Stack.Navigator screenOptions={detail}>
                <Stack.Screen name="Tabs" component={MotoTabs} options={{ headerShown: false }} />
                <Stack.Screen name="MotoEvent" getComponent={() => guardScreen(require('./screens/MotoScreens').MotoEvent, 'MotoEvent')} options={({ route }) => ({ title: route.params.event.short || route.params.event.name })} />
                <Stack.Screen name="MotoTeam" getComponent={() => guardScreen(require('./screens/MotoScreens').MotoTeam, 'MotoTeam')} options={({ route }) => ({ title: route.params.name })} />
                <Stack.Screen name="MotoRider" getComponent={() => guardScreen(require('./screens/MotoScreens').MotoRider, 'MotoRider')} options={({ route }) => ({ title: route.params.rider.name })} />
                <Stack.Screen name="Settings" component={guardScreen(SettingsScreen, 'SettingsScreen')} options={{ title: tr('Settings') }} />
              </Stack.Navigator>
            ) : (
              <Stack.Navigator screenOptions={detail}>
              <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
              <Stack.Screen name="RaceDetail" component={guardScreen(RaceDetailScreen, 'RaceDetailScreen')} options={({ route }) => ({ title: tr(shortName(route.params.meeting.meeting_name)) })} />
              <Stack.Screen name="Round" component={guardScreen(RoundScreen, 'RoundScreen')} options={({ route }) => ({ title: tr(`Round ${route.params.meeting.round}`) })} />
              <Stack.Screen name="Circuit" component={guardScreen(CircuitScreen, 'CircuitScreen')} />
              <Stack.Screen name="Driver" component={guardScreen(DriverScreen, 'DriverScreen')} options={({ route }) => ({ title: route.params.name })} />
              <Stack.Screen name="Team" component={guardScreen(TeamScreen, 'TeamScreen')} options={({ route }) => ({ title: route.params.name })} />
              <Stack.Screen name="DriverSeasons" component={guardScreen(DriverSeasonsScreen, 'DriverSeasonsScreen')} options={({ route }) => ({ title: ui.lang === 'el' ? `${route.params.name} · σεζόν` : `${route.params.name} seasons` })} />
              <Stack.Screen name="Compare" component={guardScreen(CompareScreen, 'CompareScreen')} options={{ title: tr('Head to head') }} />
              <Stack.Screen name="TeamCompare" getComponent={() => guardScreen(require('./screens/TeamCompareScreen').default, 'default')} options={{ title: tr('Team head to head') }} />
              <Stack.Screen name="Rules" getComponent={() => guardScreen(require('./screens/RulesScreen').default, 'default')} options={{ title: tr('F1 rules') }} />
              <Stack.Screen name="WhatIf" getComponent={() => guardScreen(require('./screens/WhatIfScreen').default, 'default')} options={{ title: tr('What if') }} />
              <Stack.Screen name="Predict" component={guardScreen(PredictScreen, 'PredictScreen')} options={{ title: tr('Predictions') }} />
              <Stack.Screen name="Search" getComponent={() => guardScreen(require('./screens/SearchScreen').default, 'default')} options={{ title: 'Search' }} />
              <Stack.Screen name="TimeMachine" getComponent={() => guardScreen(require('./screens/TimeMachineScreen').default, 'default')} options={{ title: 'Time machine' }} />
              <Stack.Screen name="LightsOut" getComponent={() => guardScreen(require('./screens/GameScreens').LightsOutScreen, 'LightsOutScreen')} options={{ title: 'Lights out' }} />
              <Stack.Screen name="GuessCircuit" getComponent={() => guardScreen(require('./screens/GameScreens').GuessCircuitScreen, 'GuessCircuitScreen')} options={{ title: 'Guess the circuit' }} />
              <Stack.Screen name="MysteryDriver" getComponent={() => guardScreen(require('./screens/GameScreens').MysteryDriverScreen, 'MysteryDriverScreen')} options={{ title: 'Mystery driver' }} />
              <Stack.Screen name="Cards" getComponent={() => guardScreen(require('./screens/CardScreens').default, 'default')} options={{ title: 'Driver cards' }} />
              <Stack.Screen name="Dominance" getComponent={() => guardScreen(require('./screens/InsightScreens').DominanceScreen, 'DominanceScreen')} options={{ title: 'Dominance' }} />
              <Stack.Screen name="TeamTrees" getComponent={() => guardScreen(require('./screens/InsightScreens').TeamTreesScreen, 'TeamTreesScreen')} options={{ title: 'Team family trees' }} />
              <Stack.Screen name="Rookies" getComponent={() => guardScreen(require('./screens/InsightScreens').RookieScreen, 'RookieScreen')} options={{ title: 'Rookie report' }} />
              <Stack.Screen name="FlagQuiz" getComponent={() => guardScreen(require('./screens/ExtraGames').FlagQuizScreen, 'FlagQuizScreen')} options={{ title: 'Flag quiz' }} />
              <Stack.Screen name="YearReview" getComponent={() => guardScreen(require('./screens/ExtraGames').YearReviewScreen, 'YearReviewScreen')} options={{ title: 'Year in review' }} />
              <Stack.Screen name="GridDrops" getComponent={() => guardScreen(require('./screens/GridDropsScreen').default, 'default')} options={{ title: 'Grid penalties' }} />
              <Stack.Screen name="RadioGame" getComponent={() => guardScreen(require('./screens/RadioGame').RadioGameScreen, 'RadioGameScreen')} options={{ title: 'Team radio' }} />
              <Stack.Screen name="PitStop" getComponent={() => guardScreen(require('./screens/MoreGames').PitStopScreen, 'PitStopScreen')} options={{ title: 'Pit stop timer' }} />
              <Stack.Screen name="NumberQuiz" getComponent={() => guardScreen(require('./screens/MoreGames').NumberQuizScreen, 'NumberQuizScreen')} options={{ title: 'Number quiz' }} />
              <Stack.Screen name="CareerDuel" getComponent={() => guardScreen(require('./screens/MoreGames').CareerDuelScreen, 'CareerDuelScreen')} options={{ title: 'Career duel' }} />
              <Stack.Screen name="BuildGrid" getComponent={() => guardScreen(require('./screens/MoreGames').BuildGridScreen, 'BuildGridScreen')} options={{ title: 'Build the grid' }} />
              <Stack.Screen name="Travel" getComponent={() => guardScreen(require('./screens/ExtraStats').TravelScreen, 'TravelScreen')} options={{ title: 'Season travel' }} />
              <Stack.Screen name="TitleSwing" getComponent={() => guardScreen(require('./screens/ExtraStats').TitleSwingScreen, 'TitleSwingScreen')} options={{ title: 'Title picture' }} />
              <Stack.Screen name="TeamMates" getComponent={() => guardScreen(require('./screens/ExtraStats').TeamMateScreen, 'TeamMateScreen')} options={{ title: 'Team-mate battles' }} />
              <Stack.Screen name="Passing" getComponent={() => guardScreen(require('./screens/SeasonStats').PassingScreen, 'PassingScreen')} options={{ title: 'Overtaking by circuit' }} />
              <Stack.Screen name="AlertsInbox" getComponent={() => guardScreen(require('./screens/AlertsInbox').default, 'default')} options={{ title: 'Alerts inbox' }} />
              <Stack.Screen name="Storage" getComponent={() => guardScreen(require('./screens/StorageScreen').default, 'default')} options={{ title: 'Storage' }} />
              <Stack.Screen name="GuessDriver" getComponent={() => guardScreen(require('./screens/GuessDriver').default, 'default')} options={{ title: 'Driver wordle' }} />
              <Stack.Screen name="TimelineSorter" getComponent={() => guardScreen(require('./screens/TimelineSorter').default, 'default')} options={{ title: 'Timeline sorter' }} />
              <Stack.Screen name="EngineHistory" getComponent={() => guardScreen(require('./screens/EngineHistory').default, 'default')} options={{ title: 'Engine suppliers' }} />
              <Stack.Screen name="TrophyRoom" getComponent={() => guardScreen(require('./screens/TrophyRoom').default, 'default')} options={{ title: 'Trophy room' }} />
              <Stack.Screen name="PoleConversion" getComponent={() => guardScreen(require('./screens/PoleConversion').default, 'default')} options={{ title: 'Pole to win' }} />
              <Stack.Screen name="FavDigest" getComponent={() => guardScreen(require('./screens/FavDigest').default, 'default')} options={{ title: 'Favourites digest' }} />
              <Stack.Screen name="RaceBingo" getComponent={() => guardScreen(require('./screens/RaceBingo').default, 'default')} options={{ title: 'Race bingo' }} />
              <Stack.Screen name="OddOneOut" getComponent={() => guardScreen(require('./screens/OddOneOut').default, 'default')} options={{ title: 'Odd one out' }} />
              <Stack.Screen name="Droughts" getComponent={() => guardScreen(require('./screens/RankLists').DroughtsScreen, 'DroughtsScreen')} options={{ title: 'Win droughts' }} />
              <Stack.Screen name="Winless" getComponent={() => guardScreen(require('./screens/RankLists').WinlessScreen, 'WinlessScreen')} options={{ title: 'Best without a win' }} />
              <Stack.Screen name="PlacesGained" getComponent={() => guardScreen(require('./screens/RankLists').PlacesGainedScreen, 'PlacesGainedScreen')} options={{ title: 'Places gained' }} />
              <Stack.Screen name="SeasonStrip" getComponent={() => guardScreen(require('./screens/SeasonStrip').default, 'default')} options={{ title: 'Season progress' }} />
              <Stack.Screen name="NameSeason" getComponent={() => guardScreen(require('./screens/QuizPack').NameSeasonScreen, 'NameSeasonScreen')} options={{ title: 'Name that season' }} />
              <Stack.Screen name="CareerPath" getComponent={() => guardScreen(require('./screens/QuizPack').CareerPathScreen, 'CareerPathScreen')} options={{ title: 'Career path' }} />
              <Stack.Screen name="Showdown" getComponent={() => guardScreen(require('./screens/QuizPack').ShowdownScreen, 'ShowdownScreen')} options={{ title: 'Stat showdown' }} />
              <Stack.Screen name="MatchPairs" getComponent={() => guardScreen(require('./screens/QuizPack').MatchPairsScreen, 'MatchPairsScreen')} options={{ title: 'Match pairs' }} />
              <Stack.Screen name="GridOdds" getComponent={() => guardScreen(require('./screens/TitleStats').GridOddsScreen, 'GridOddsScreen')} options={{ title: 'Grid slot odds' }} />
              <Stack.Screen name="Lineups" getComponent={() => guardScreen(require('./screens/TitleStats').LineupScreen, 'LineupScreen')} options={{ title: 'Line-up strength' }} />
              <Stack.Screen name="TitleHistory" getComponent={() => guardScreen(require('./screens/TitleStats').TitleHistoryScreen, 'TitleHistoryScreen')} options={{ title: 'Title history' }} />
              <Stack.Screen name="Rivalry" getComponent={() => guardScreen(require('./screens/Rivalry').default, 'default')} options={{ title: 'Rivalry' }} />
              <Stack.Screen name="Ladder" getComponent={() => guardScreen(require('./screens/TriviaGames').TriviaLadderScreen, 'TriviaLadderScreen')} options={{ title: 'Trivia ladder' }} />
              <Stack.Screen name="DailyPuzzle" getComponent={() => guardScreen(require('./screens/TriviaGames').DailyPuzzleScreen, 'DailyPuzzleScreen')} options={{ title: 'Daily puzzle' }} />
              <Stack.Screen name="WordSearch" getComponent={() => guardScreen(require('./screens/TriviaGames').WordSearchScreen, 'WordSearchScreen')} options={{ title: 'Word search' }} />
              <Stack.Screen name="AgeRecords" getComponent={() => guardScreen(require('./screens/AgeStats').AgeRecordsScreen, 'AgeRecordsScreen')} options={{ title: 'Age records' }} />
              <Stack.Screen name="HatTricks" getComponent={() => guardScreen(require('./screens/AgeStats').HatTricksScreen, 'HatTricksScreen')} options={{ title: 'Hat-tricks' }} />
              <Stack.Screen name="BestDebuts" getComponent={() => guardScreen(require('./screens/AgeStats').BestDebutsScreen, 'BestDebutsScreen')} options={{ title: 'Best debut seasons' }} />
              <Stack.Screen name="DnfRates" getComponent={() => guardScreen(require('./screens/AgeStats').DnfRatesScreen, 'DnfRatesScreen')} options={{ title: 'DNF rates' }} />
              <Stack.Screen name="ComparePicks" getComponent={() => guardScreen(require('./screens/ComparePicks').default, 'default')} options={{ title: 'My picks vs real' }} />
              <Stack.Screen name="HigherLower" getComponent={() => guardScreen(require('./screens/NewGames').HigherLowerScreen, 'HigherLowerScreen')} options={{ title: 'Higher or lower' }} />
              <Stack.Screen name="Bracket" getComponent={() => guardScreen(require('./screens/NewGames').BracketScreen, 'BracketScreen')} options={{ title: 'Tournament bracket' }} />
              <Stack.Screen name="Scramble" getComponent={() => guardScreen(require('./screens/NewGames').ScrambleScreen, 'ScrambleScreen')} options={{ title: 'Season scramble' }} />
              <Stack.Screen name="TeamCurves" getComponent={() => guardScreen(require('./screens/TeamStats').TeamCurvesScreen, 'TeamCurvesScreen')} options={{ title: 'Team curves' }} />
              <Stack.Screen name="Rematch" getComponent={() => guardScreen(require('./screens/TeamStats').RematchScreen, 'RematchScreen')} options={{ title: 'Same-race rematches' }} />
              <Stack.Screen name="Poster" getComponent={() => guardScreen(require('./screens/Extras151').PosterScreen, 'PosterScreen')} options={{ title: 'Poster maker' }} />
              <Stack.Screen name="FavCircuits" getComponent={() => guardScreen(require('./screens/Extras151').FavCircuitsScreen, 'FavCircuitsScreen')} options={{ title: 'My circuits' }} />
              <Stack.Screen name="Freshness" getComponent={() => guardScreen(require('./screens/Extras151').FreshnessScreen, 'FreshnessScreen')} options={{ title: 'Data freshness' }} />
              <Stack.Screen name="Livery" getComponent={() => guardScreen(require('./screens/ColourGames').LiveryScreen, 'LiveryScreen')} options={{ title: 'Team colours' }} />
              <Stack.Screen name="SpeedRound" getComponent={() => guardScreen(require('./screens/ColourGames').SpeedRoundScreen, 'SpeedRoundScreen')} options={{ title: 'Speed round' }} />
              <Stack.Screen name="StatsHub" getComponent={() => guardScreen(require('./screens/StatsHub').default, 'default')} options={{ title: 'Statistics' }} />
              <Stack.Screen name="Journeymen" getComponent={() => guardScreen(require('./screens/HistoryTrends').JourneymenScreen, 'JourneymenScreen')} options={{ title: 'Journeymen' }} />
              <Stack.Screen name="GridAge" getComponent={() => guardScreen(require('./screens/HistoryTrends').GridAgeScreen, 'GridAgeScreen')} options={{ title: 'Grid age over time' }} />
              <Stack.Screen name="CalendarGrowth" getComponent={() => guardScreen(require('./screens/HistoryTrends').CalendarGrowthScreen, 'CalendarGrowthScreen')} options={{ title: 'Calendar growth' }} />
              <Stack.Screen name="WatchList" getComponent={() => guardScreen(require('./screens/WatchList').default, 'default')} options={{ title: 'Watch list' }} />
              <Stack.Screen name="CrashLog" getComponent={() => guardScreen(require('./screens/CrashLog').default, 'default')} options={{ title: 'Crash log' }} />
              <Stack.Screen name="DriverGrid" getComponent={() => guardScreen(require('./screens/GridGames').DriverGridScreen, 'DriverGridScreen')} options={{ title: 'Driver grid' }} />
              <Stack.Screen name="SurnameChain" getComponent={() => guardScreen(require('./screens/GridGames').SurnameChainScreen, 'SurnameChainScreen')} options={{ title: 'Surname chain' }} />
              <Stack.Screen name="GuessYear" getComponent={() => guardScreen(require('./screens/GridGames').GuessYearScreen, 'GuessYearScreen')} options={{ title: 'Guess the year' }} />
              <Stack.Screen name="ConstructorTitles" getComponent={() => guardScreen(require('./screens/Stats153').ConstructorTitlesScreen, 'ConstructorTitlesScreen')} options={{ title: "Constructors' titles" }} />
              <Stack.Screen name="SeasonParity" getComponent={() => guardScreen(require('./screens/Stats153').SeasonParityScreen, 'SeasonParityScreen')} options={{ title: 'Season parity' }} />
              <Stack.Screen name="OpenersClosers" getComponent={() => guardScreen(require('./screens/Stats153').OpenersClosersScreen, 'OpenersClosersScreen')} options={{ title: 'Openers and finales' }} />
              <Stack.Screen name="PointsPerStart" getComponent={() => guardScreen(require('./screens/Stats153').PointsPerStartScreen, 'PointsPerStartScreen')} options={{ title: 'Points per start' }} />
              <Stack.Screen name="Duel" getComponent={() => guardScreen(require('./screens/Games153').DuelScreen, 'DuelScreen')} options={{ title: 'Pass-and-play duel' }} />
              <Stack.Screen name="TeamMateGame" getComponent={() => guardScreen(require('./screens/Games153').TeamMateGameScreen, 'TeamMateGameScreen')} options={{ title: 'Who was the team-mate' }} />
              <Stack.Screen name="Report" getComponent={() => guardScreen(require('./screens/Report').default, 'default')} options={{ title: 'Send a report' }} />
              <Stack.Screen name="MyCard" getComponent={() => guardScreen(require('./screens/MyCard').default, 'default')} options={{ title: 'My F1 card' }} />
              <Stack.Screen name="CareerBingo" getComponent={() => guardScreen(require('./screens/Games153').CareerBingoScreen, 'CareerBingoScreen')} options={{ title: 'Career bingo' }} />
              <Stack.Screen name="Birthday" getComponent={() => guardScreen(require('./screens/Stats155').BirthdayScreen, 'BirthdayScreen')} options={{ title: 'On my birthday' }} />
              <Stack.Screen name="EraExplorer" getComponent={() => guardScreen(require('./screens/Stats155').EraExplorerScreen, 'EraExplorerScreen')} options={{ title: 'Era explorer' }} />
              <Stack.Screen name="Slipstream" getComponent={() => guardScreen(require('./screens/Arcade155').SlipstreamScreen, 'SlipstreamScreen')} options={{ title: 'Slipstream dodge' }} />
              <Stack.Screen name="Sweeper" getComponent={() => guardScreen(require('./screens/Arcade155').SweeperScreen, 'SweeperScreen')} options={{ title: 'Safety car sweeper' }} />
              <Stack.Screen name="Points2048" getComponent={() => guardScreen(require('./screens/Arcade155').Points2048Screen, 'Points2048Screen')} options={{ title: 'Points 2048' }} />
              <Stack.Screen name="ColourMemory" getComponent={() => guardScreen(require('./screens/Party155').ColourMemoryScreen, 'ColourMemoryScreen')} options={{ title: 'Team colour memory' }} />
              <Stack.Screen name="Battleship" getComponent={() => guardScreen(require('./screens/Party155').BattleshipScreen, 'BattleshipScreen')} options={{ title: 'Track battleship' }} />
              <Stack.Screen name="DraftDuel" getComponent={() => guardScreen(require('./screens/Party155').DraftDuelScreen, 'DraftDuelScreen')} options={{ title: 'Draft duel' }} />
              <Stack.Screen name="GridDuel" getComponent={() => guardScreen(require('./screens/Party155').GridDuelScreen, 'GridDuelScreen')} options={{ title: 'Tic-tac-toe grid' }} />
              <Stack.Screen name="ConnectFour" getComponent={() => guardScreen(require('./screens/Table157').ConnectFourScreen, 'ConnectFourScreen')} options={{ title: 'Connect four' }} />
              <Stack.Screen name="Blackjack" getComponent={() => guardScreen(require('./screens/Table157').BlackjackScreen, 'BlackjackScreen')} options={{ title: 'Blackjack 21' }} />
              <Stack.Screen name="LapChart" getComponent={() => guardScreen(require('./screens/Laps157').default, 'default')} options={{ title: 'Lap chart' }} />
              <Stack.Screen name="GameStats" getComponent={() => guardScreen(require('./screens/GameStats').default, 'default')} options={{ title: 'Games stats' }} />
              <Stack.Screen name="Snake" getComponent={() => guardScreen(require('./screens/Arcade158').SnakeScreen, 'SnakeScreen')} options={{ title: 'Snake' }} />
              <Stack.Screen name="Checkers" getComponent={() => guardScreen(require('./screens/Arcade158').CheckersScreen, 'CheckersScreen')} options={{ title: 'Checkers' }} />
              <Stack.Screen name="DailyChallenges" getComponent={() => guardScreen(require('./screens/Challenges158').DailyChallengesScreen, 'DailyChallengesScreen')} options={{ title: 'Daily challenges' }} />
              <Stack.Screen name="Achievements" getComponent={() => guardScreen(require('./screens/Challenges158').AchievementsScreen, 'AchievementsScreen')} options={{ title: 'Achievements' }} />
              <Stack.Screen name="SeasonHeatmap" getComponent={() => guardScreen(require('./screens/Stats158').SeasonHeatmapScreen, 'SeasonHeatmapScreen')} options={{ title: 'Season heatmap' }} />
              <Stack.Screen name="QualiBattles" getComponent={() => guardScreen(require('./screens/Stats158').QualiBattlesScreen, 'QualiBattlesScreen')} options={{ title: 'Team-mate battles' }} />
              <Stack.Screen name="CountdownCard" getComponent={() => guardScreen(require('./screens/CountdownCard').default, 'default')} options={{ title: 'Countdown card' }} />
              <Stack.Screen name="NumberHistory" getComponent={() => guardScreen(require('./screens/Numbers159').NumberHistoryScreen, 'NumberHistoryScreen')} options={{ title: 'Number history' }} />
              <Stack.Screen name="SprintStats" getComponent={() => guardScreen(require('./screens/Numbers159').SprintStatsScreen, 'SprintStatsScreen')} options={{ title: 'Sprint weekends' }} />
              <Stack.Screen name="PinnedPages" getComponent={() => guardScreen(require('./screens/Pins159').default, 'default')} options={{ title: 'Pinned pages' }} />
              <Stack.Screen name="Streaks" getComponent={() => guardScreen(require('./screens/Streaks').default, 'default')} options={{ title: 'Streaks' }} />
              <Stack.Screen name="CareerCurves" getComponent={() => guardScreen(require('./screens/CareerCurves').default, 'default')} options={{ title: 'Career curves' }} />
              <Stack.Screen name="CompareSeasons" getComponent={() => guardScreen(require('./screens/SeasonStats').CompareSeasonsScreen, 'CompareSeasonsScreen')} options={{ title: 'Compare seasons' }} />
              <Stack.Screen name="TrueFalse" getComponent={() => guardScreen(require('./screens/ExtraGames').TrueFalseScreen, 'TrueFalseScreen')} options={{ title: 'True or false' }} />
              <Stack.Screen name="SeasonReview" getComponent={() => guardScreen(require('./screens/ReviewScreens').SeasonReviewScreen, 'SeasonReviewScreen')} options={{ title: 'Season review' }} />
              <Stack.Screen name="Debuts" getComponent={() => guardScreen(require('./screens/ReviewScreens').DebutsScreen, 'DebutsScreen')} options={{ title: 'Debuts and farewells' }} />
              <Stack.Screen name="CircuitCompare" getComponent={() => guardScreen(require('./screens/ReviewScreens').CircuitCompareScreen, 'CircuitCompareScreen')} options={{ title: 'Circuit comparison' }} />
              <Stack.Screen name="WinnerGuess" getComponent={() => guardScreen(require('./screens/MoreGames').WinnerGuessScreen, 'WinnerGuessScreen')} options={{ title: 'Winner guess' }} />
              <Stack.Screen name="Milestones" getComponent={() => guardScreen(require('./screens/RecordScreens').MilestonesScreen, 'MilestonesScreen')} options={{ title: 'Driver milestones' }} />
              <Stack.Screen name="HomeHeroes" getComponent={() => guardScreen(require('./screens/RecordScreens').HomeHeroesScreen, 'HomeHeroesScreen')} options={{ title: 'Home-race heroes' }} />
              <Stack.Screen name="PodiumPairs" getComponent={() => guardScreen(require('./screens/RecordScreens').PodiumPairsScreen, 'PodiumPairsScreen')} options={{ title: 'Podium pairs' }} />
              <Stack.Screen name="Connections" getComponent={() => guardScreen(require('./screens/PuzzleGames').ConnectionsScreen, 'ConnectionsScreen')} options={{ title: 'Connections' }} />
              <Stack.Screen name="Hangman" getComponent={() => guardScreen(require('./screens/PuzzleGames').HangmanScreen, 'HangmanScreen')} options={{ title: 'Hangman' }} />
              <Stack.Screen name="Comebacks" getComponent={() => guardScreen(require('./screens/RecordScreens').ComebacksScreen, 'ComebacksScreen')} options={{ title: 'Biggest comebacks' }} />
              <Stack.Screen name="ClosestNumber" getComponent={() => guardScreen(require('./screens/MoreGames').ClosestNumberScreen, 'ClosestNumberScreen')} options={{ title: 'Closest number' }} />
              <Stack.Screen name="LapTapper" getComponent={() => guardScreen(require('./screens/MoreGames').LapTapperScreen, 'LapTapperScreen')} options={{ title: 'Lap tapper' }} />
              <Stack.Screen name="Reliability" getComponent={() => guardScreen(require('./screens/ReliabilityScreen').default, 'default')} options={{ title: 'Reliability' }} />
              <Stack.Screen name="Replay" getComponent={() => guardScreen(require('./screens/ReplayScreen').default, 'default')} options={{ title: 'Season replay' }} />
              <Stack.Screen name="FanZone" getComponent={() => guardScreen(require('./screens/FanZoneScreen').default, 'default')} options={{ title: 'Fan zone' }} />
              <Stack.Screen name="Teammates" getComponent={() => guardScreen(require('./screens/TeammatesScreen').default, 'default')} options={{ title: 'Team-mate battles' }} />
              <Stack.Screen name="RaceDay" getComponent={() => guardScreen(require('./screens/RaceDayScreen').default, 'default')} options={{ title: 'Race day' }} />
              <Stack.Screen name="Dev" getComponent={() => guardScreen(require('./screens/DevScreen').default, 'default')} options={{ title: 'Developer menu' }} />
              <Stack.Screen name="Weekend" getComponent={() => guardScreen(require('./screens/ExploreScreens').WeekendScreen, 'WeekendScreen')} options={{ title: 'Race weekend' }} />
              <Stack.Screen name="Leaderboard" getComponent={() => guardScreen(require('./screens/ExploreScreens').LeaderboardScreen, 'LeaderboardScreen')} options={{ title: 'Leaderboard' }} />
              <Stack.Screen name="Quiz" getComponent={() => guardScreen(require('./screens/ExploreScreens').QuizScreen, 'QuizScreen')} options={{ title: 'Quiz' }} />
              <Stack.Screen name="Records" getComponent={() => guardScreen(require('./screens/ExploreScreens').RecordsScreen, 'RecordsScreen')} options={{ title: 'Records & history' }} />
              <Stack.Screen name="Chart" getComponent={() => guardScreen(require('./screens/ChartScreen').default, 'default')} options={{ title: tr('Season chart') }} />
              <Stack.Screen name="Grid" getComponent={() => guardScreen(require('./screens/GridScreen').default, 'default')} options={{ title: tr('Next season grid') }} />
              <Stack.Screen name="FantasyHub" getComponent={() => guardScreen(require('./screens/FunHubs').FantasyHub, 'FantasyHub')} options={{ title: 'Fantasy' }} />
              <Stack.Screen name="FunGames" getComponent={() => guardScreen(require('./screens/FunHubs').FunGames, 'FunGames')} options={{ title: 'Games' }} />
              <Stack.Screen name="FunProfile" component={guardScreen(FunProfile, 'FunProfile')} options={{ title: 'Your driver' }} />
              <Stack.Screen name="FunSettings" getComponent={() => guardScreen(require('./screens/FantasyScreens').FunSettings, 'FunSettings')} options={{ title: 'Fantasy settings' }} />
              <Stack.Screen name="FantasyNew" getComponent={() => guardScreen(require('./screens/FantasyScreens').FantasyNew, 'FantasyNew')} options={{ title: 'New fantasy season' }} />
              <Stack.Screen name="FantasyPresets" getComponent={() => guardScreen(require('./screens/PresetScreens').FantasyPresets, 'FantasyPresets')} options={{ title: 'Presets' }} />
              <Stack.Screen name="PresetNew" getComponent={() => guardScreen(require('./screens/FantasyScreens').PresetNew, 'PresetNew')} options={{ title: 'New grid preset' }} />
              <Stack.Screen name="PresetGrid" getComponent={() => guardScreen(require('./screens/FantasyScreens').PresetGrid, 'PresetGrid')} options={{ title: 'Grid preset' }} />
              <Stack.Screen name="Fantasy" getComponent={() => guardScreen(require('./screens/FantasyScreens').Fantasy, 'Fantasy')} options={{ title: 'Fantasy' }} />
              <Stack.Screen name="FantasyRace" getComponent={() => guardScreen(require('./screens/FantasyScreens').FantasyRace, 'FantasyRace')} options={({ route }) => ({ title: 'Race result' })} />
              <Stack.Screen name="FantasyDriver" getComponent={() => guardScreen(require('./screens/FantasyScreens').FantasyDriver, 'FantasyDriver')} options={{ title: 'Driver' }} />
              <Stack.Screen name="FantasyTransfers" getComponent={() => guardScreen(require('./screens/FantasyScreens').FantasyTransfers, 'FantasyTransfers')} options={{ title: 'Transfers' }} />
              <Stack.Screen name="SavedNews" getComponent={() => guardScreen(require('./screens/NewsScreen').SavedNewsScreen, 'SavedNewsScreen')} options={{ title: tr('Saved articles') }} />
              <Stack.Screen name="Article" component={guardScreen(ArticleScreen, 'ArticleScreen')} options={{ title: tr('News') }} />
              <Stack.Screen name="Settings" component={guardScreen(SettingsScreen, 'SettingsScreen')} options={{ title: tr('Settings') }} />
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
