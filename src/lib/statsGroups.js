import { colors } from '../theme';
// The Statistics hub groups: [title, icon, colour, [page routes]]. Also gives the order for swiping between statistics screens.
export const GROUPS = [
  ['Records and rankings', 'trophy', colors.gold, ['Records', 'Dominance', 'TitleHistory', 'ConstructorTitles', 'SeasonParity', 'OpenersClosers', 'PointsPerStart', 'GridOdds', 'Lineups', 'Streaks', 'NumberHistory', 'SprintStats', 'Droughts', 'Winless', 'PoleConversion', 'PlacesGained', 'Comebacks', 'HatTricks', 'AgeRecords', 'BestDebuts', 'DnfRates', 'PodiumPairs', 'HomeHeroes', 'Milestones', 'GridDrops', 'Reliability']],
  ['Seasons and races', 'calendar', colors.accent, ['LapChart', 'SeasonHeatmap', 'QualiBattles', 'SeasonStrip', 'EraExplorer', 'SeasonReview', 'CompareSeasons', 'CalendarGrowth', 'GridAge', 'Debuts', 'Travel', 'Passing', 'TitleSwing', 'Rematch', 'TimeMachine', 'Replay', 'WhatIf']],
  ['Drivers, teams and tracks', 'people', colors.good, ['CareerCurves', 'TeamCurves', 'TeamMates', 'Journeymen', 'EngineHistory', 'TeamTrees', 'CircuitCompare']],
  ['Yours', 'person-circle', colors.red, ['ComparePicks', 'FavDigest', 'CountdownCard', 'GameStats', 'Achievements', 'DailyChallenges', 'TrophyRoom', 'YearReview', 'FavCircuits', 'WatchList', 'Rivalry', 'Poster', 'MyCard', 'Birthday']],
];
export const STAT_ORDER = GROUPS.flatMap((g) => g[3]);
