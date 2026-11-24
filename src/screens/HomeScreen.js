import Reveal from '../components/Reveal';
import { up } from '../lib/i18n';
import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, LayoutAnimation } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../components/Skeleton';
import { Text } from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import UpdateBanner from '../components/UpdateBanner';
import BackupNudge from '../components/BackupNudge';
import Screen, { ErrorNote, Card, Eyebrow, Note } from '../components/Screen';
import { Countdown, ResultRow, ResultLine, DriverName } from '../components/Shared';
import Grad, { Scrim } from '../components/Grad';
import { SprintBadge } from '../components/Badge';
import { useSeason, useNow } from '../hooks/useSeason';
import { useAsync } from '../hooks/useAsync';
import { driverStandings, constructorStandings, lastRace } from '../api/jolpica';
import { usePrefs } from '../hooks/usePrefs';
import { TeamBadge } from '../components/Shared';
import { homeOrder } from '../lib/homeLayout';
import { STAT_ORDER } from '../lib/statsGroups';
import { PAGES } from '../lib/pages';
import SpoilerGuard from '../components/SpoilerGuard';
import { useSpoilerHidden } from '../lib/spoiler';
import RaceRecap from '../components/RaceRecap';
import RivalryCard from '../components/RivalryCard';
import ShareCard from '../components/ShareCard';
import { statOfDay } from '../lib/statOfDay';
import { today } from '../lib/kv';
import LastSession from '../components/LastSession';
import { YEAR } from '../api/openf1';
import { colors, alpha } from '../theme';
import { useTeamColor } from '../hooks/useTeams';
import { ScrollView, Image } from 'react-native';
import { driverPhoto } from '../lib/media';
import { useFavs } from '../hooks/useFavs';
import { dateRange, shortName, flag } from '../lib/time';

export function targetOf(next, sessions, now) {
  const cur = sessions.find((x) => now >= Date.parse(x.date_start) && now < Date.parse(x.date_end));
  const up = sessions.find((x) => Date.parse(x.date_start) > now);
  return { cur, target: cur ? Date.parse(cur.date_end) : up ? Date.parse(up.date_start) : Date.parse(next.date_start),
    label: cur ? `${cur.session_name} ends in` : up ? `Until ${up.session_name}` : 'Until lights out' };
}
export default function HomeScreen({ navigation }) {
  const spoil = useSpoilerHidden('home');
  const season = useSeason(); const now = useNow();
  const favs = useFavs(); const tc = useTeamColor();
  const stand = useAsync(() => driverStandings(YEAR), []);
  const tstand = useAsync(() => constructorStandings(YEAR), []);
  const lastR = useAsync(() => lastRace(YEAR).catch(() => null), []);
  const { prefs, setOpt } = usePrefs(); const [mineView, setMineView] = useState(prefs.opts.homeFirst === 'teams' ? 'teams' : 'drivers');
  const [slow, setSlow] = useState(false);
  useEffect(() => { if (season.status !== 'loading') { setSlow(false); return; } const t = setTimeout(() => setSlow(true), 8000); return () => clearTimeout(t); }, [season.status]);
  if (season.status === 'loading') return (
    <Screen>
      <Skeleton />
      {slow ? <Note>Still loading. The race data servers are slow or unreachable from this device. Open Settings (gear icon) and run Check data sources.</Note> : null}
    </Screen>
  );
  if (season.status === 'error') return <Screen><Card><Text style={s.big}>Couldn't load the season</Text><ErrorNote error={season.error} onRetry={season.reload} /></Card></Screen>;
  const { next, sessions, total } = season; const t = next && targetOf(next, sessions, now);
  const rows = stand.v || []; const mine = rows.filter((r) => favs.isDriver(r.driverId)); const mineT = (tstand.v || []).filter((r) => favs.isTeam(r.teamId));
  // The card shows the chosen kind; when only one kind has favourites it shows that one. The swap button appears when both exist.
  const both = mine.length > 0 && mineT.length > 0; const showTeams = mineT.length > 0 && (mineView === 'teams' || mine.length === 0);
  const openDriver = (r) => navigation.navigate('Driver', { driverId: r.driverId, name: r.name, first: r.first, last: r.last, teamId: r.teamId, team: r.team });
  const stat = (() => { try { return statOfDay(today(), spoil ? null : rows); } catch { return null; } })();
  const pins = (prefs.opts.pins || []).map((r) => PAGES.find((x) => x[0] === r)).filter(Boolean);
  const P = {
    pins: pins.length ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {pins.map(([route, title]) => (<Pressable key={route} accessibilityRole="button" onPress={() => navigation.navigate(route)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: alpha(colors.accent, 0.16), borderWidth: 1, borderColor: alpha(colors.accent, 0.4) }, pressed && { opacity: 0.75 }]}><Ionicons name="pin" size={14} color={colors.accentText} /><Text style={{ color: colors.fg, fontWeight: '800', fontSize: 14 }}>{title}</Text></Pressable>))}
      </ScrollView>
    ) : null,
    stat: stat ? (
      <ShareCard title={`${stat.tag}: ${stat.text}`}><Card><Eyebrow>{`Stat of the day · ${stat.tag}`}</Eyebrow><Text style={{ color: colors.fg, fontSize: 17, lineHeight: 24, marginTop: 6 }}>{stat.text}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>{stat.src}</Text></Card></ShareCard>
    ) : null,
    next: (
      <View>
      {next ? (
        <Pressable onPress={() => navigation.navigate('RaceDetail', { meeting: next })} style={({ pressed }) => pressed && { transform: [{ scale: 0.99 }] }}>
          <Grad color={colors.accent} from={0.3} to={0.02} radius={28} border={0.4} style={{ padding: 20 }}>
            <Text style={{ color: colors.fg, fontSize: 14, fontWeight: '900', letterSpacing: 2, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } }}>{`${Date.parse(next.date_start) <= now ? 'RACE WEEKEND' : 'NEXT RACE'} • ROUND ${next.round}`}</Text>
            <Text style={{ color: colors.fg, fontSize: 28, fontWeight: '800', lineHeight: 32, marginTop: 8, textAlign: 'center' }}>{next.meeting_name}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3, textAlign: 'center' }} numberOfLines={1}>{[next.circuit_short_name, dateRange(next), next.has_sprint ? 'Sprint weekend' : ''].filter(Boolean).join(' · ')}</Text>
            <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1.6, marginTop: 14, textAlign: 'center' }}>{up(t.label)}</Text>
            {(() => { let sec = Math.max(0, Math.floor((t.target - now) / 1000)); const dd = Math.floor(sec / 86400); sec %= 86400; const hh = Math.floor(sec / 3600); sec %= 3600; const mm = Math.floor(sec / 60); return (
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }} accessibilityRole="timer">
                {[[dd, 'DAYS'], [hh, 'HOURS'], [mm, 'MIN']].map(([v, l]) => (
                  <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <Text style={{ color: colors.fg, fontSize: 30, fontWeight: '800', lineHeight: 34 }}>{String(v).padStart(2, '0')}</Text>
                    <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1.5 }}>{l}</Text>
                  </View>))}
              </View>); })()}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Pressable onPress={() => navigation.navigate('RaceDetail', { meeting: next })} accessibilityRole="button" style={({ pressed }) => [{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: colors.accent }, pressed && { opacity: 0.85 }]}><Text style={{ color: colors.onAccent, fontWeight: '800', fontSize: 15 }}>Open weekend</Text></Pressable>
              <Pressable onPress={() => navigation.navigate('Predict')} accessibilityLabel="Predict this race" style={({ pressed }) => [{ paddingHorizontal: 16, justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 15 }}>Predict</Text></Pressable>
              <Pressable onPress={() => navigation.navigate('AlertsInbox')} accessibilityLabel="Alerts" style={({ pressed }) => [{ width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' }, pressed && { opacity: 0.7 }]}><Ionicons name="notifications-outline" size={19} color={colors.fg} /></Pressable>
            </View>
          </Grad>
        </Pressable>
      ) : <Card><Text style={s.big}>Season complete</Text></Card>}

      </View>
    ),
    stats: (
      <View>
        <Pressable onPress={() => navigation.navigate('StatsHub')} accessibilityLabel="Statistics, open" style={({ pressed }) => [{ marginTop: 0 }, pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }]}>
          <Grad color={colors.accent} from={0.4} to={0.08} radius={22} border style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.cardB }}>
            <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: alpha(colors.accent, 0.3), alignItems: 'center', justifyContent: 'center' }}><Ionicons name="stats-chart" size={28} color={colors.fg} /></View>
            <View style={{ flex: 1 }}><Text style={{ color: colors.fg, fontSize: 22, fontWeight: '800' }}>Statistics</Text><Text style={{ color: colors.onSoft, fontSize: 13 }} numberOfLines={2}>Records, streaks, rankings and 75 years of history</Text></View>
            <Ionicons name="chevron-forward" size={22} color={colors.fg} />
          </Grad>
        </Pressable>
      </View>
    ),
    explore: (
      <View>
        <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }}>Explore</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10 }}>
          {[['Rivalry', 'Rivalry', 'flash', 'Pin two drivers', colors.red], ['Journeymen', 'Journeymen', 'swap-horizontal', 'Most teams raced for', colors.gold], ['GridAge', 'Grid age', 'hourglass', 'Average age by season', colors.good], ['CalendarGrowth', 'Calendar growth', 'earth', 'Races per season', colors.accent], ['WatchList', 'Watch list', 'bookmark', 'Races to watch later', colors.red], ['TeamCurves', 'Team curves', 'analytics', 'Two teams over time', colors.accent], ['Rematch', 'Rematches', 'repeat', 'Every edition of a GP', colors.gold], ['Poster', 'Poster maker', 'image', 'Share a driver poster', colors.red], ['FavCircuits', 'My circuits', 'heart', 'Loved and visited', colors.red], ['AgeRecords', 'Age records', 'time', 'Youngest and oldest', colors.gold], ['HatTricks', 'Hat-tricks', 'ribbon', 'Pole, win, fastest lap', colors.red], ['BestDebuts', 'Best debuts', 'rocket', 'Strongest first seasons', colors.good], ['DnfRates', 'DNF rates', 'construct', 'Who retires most', colors.accent], ['ComparePicks', 'My picks', 'checkmark-done', 'Predictions vs real', colors.accent], ['GridOdds', 'Grid slot odds', 'podium', 'How often each start wins', colors.gold], ['Lineups', 'Line-up strength', 'people', 'Best and worst pairings', colors.accent], ['TitleHistory', 'Title history', 'trophy', 'How titles were decided', colors.gold], ['Ladder', 'Trivia ladder', 'trending-up', 'Endless, three lives', colors.purple], ['DailyPuzzle', 'Daily puzzle', 'today', 'Same five for everyone', colors.good], ['WordSearch', 'Word search', 'search', 'Hidden drivers and circuits', colors.accent], ['SeasonStrip', 'Season strip', 'film', 'Every round at a glance', colors.accent], ['Droughts', 'Win droughts', 'hourglass', 'Longest waits', colors.red], ['Winless', 'Without a win', 'sad', 'Never won, one win', colors.gold], ['PlacesGained', 'Places gained', 'trending-up', 'Grid to flag', colors.good], ['FavDigest', 'My digest', 'heart', 'How my favourites did', colors.accent], ['PoleConversion', 'Pole to win', 'ribbon', 'How often pole wins', colors.good], ['EngineHistory', 'Engines', 'hardware', 'Wins by power unit', colors.gold], ['Streaks', 'Streaks', 'flame', 'Longest runs', colors.red], ['CareerCurves', 'Career curves', 'analytics', 'Two careers, one chart', colors.gold], ['Comebacks', 'Comebacks', 'trending-up', 'Wins from the back', colors.red], ['Milestones', 'Milestones', 'flag', 'Next career records', colors.gold], ['HomeHeroes', 'Home heroes', 'home', 'Who wins at home', colors.good], ['PodiumPairs', 'Podium pairs', 'people', 'Most shared podiums', colors.accent], ['SeasonReview', 'Season review', 'newspaper', 'A year in numbers', colors.accent], ['Debuts', 'Debuts and farewells', 'person-add', 'Who joined and left', colors.good], ['CircuitCompare', 'Circuit compare', 'git-compare', 'Two tracks side by side', colors.gold], ['Passing', 'Overtaking', 'swap-horizontal', 'Where the order shuffles', colors.red], ['CompareSeasons', 'Compare seasons', 'git-compare', 'Two years side by side', colors.gold], ['TitleSwing', 'Title picture', 'trending-up', 'Standings after each race', colors.gold], ['TeamMates', 'Team-mate battles', 'people', 'Career head-to-head', colors.accent], ['Travel', 'Season travel', 'airplane', 'Kilometres between rounds', colors.good], ['GridDrops', 'Grid penalties', 'arrow-down-circle', 'Who started further back', colors.red], ['Dominance', 'Dominance', 'flame', 'Most dominant seasons', colors.gold], ['TeamTrees', 'Team trees', 'git-branch', 'Every team\'s history', colors.accent], ['Rookies', 'Rookie report', 'school', 'How the rookies are doing', colors.good], ['Reliability', 'Reliability', 'construct', 'Retirements by team', colors.accent], ['Cards', 'Driver cards', 'albums', 'Collect and open packs', colors.gold], ['MysteryDriver', 'Mystery driver', 'help-circle', 'A new driver every day', colors.accent], ['Search', 'Search', 'search', 'Drivers, teams, circuits, rules', colors.accent], ['RaceDay', 'Race day', 'pulse', 'Live session, weather, order', colors.red], ['TimeMachine', 'Time machine', 'time', 'Watch any past race lap by lap', colors.gold], ['Replay', 'Season replay', 'play-back', 'Any past season, your rules', colors.accent], ['FanZone', 'Fan zone', 'happy', 'Daily quiz, driver of the day', colors.gold], ['Weekend', 'Race weekend', 'time', 'Timeline, weather, what to watch', colors.accent], ['Leaderboard', 'Leaderboard', 'podium', 'Predictions vs friends', colors.gold], ['Quiz', 'Quiz', 'help-circle', 'Test your F1 knowledge', colors.purple], ['Records', 'Records', 'stats-chart', 'On this day, records, duels', '#2CB67D'], ['FunProfile', 'Fantasy', 'sparkles', 'Your own seasons', '#4DA3FF']].filter((x) => x[0] !== 'FunProfile').filter(([route]) => route === 'Rivalry' || !STAT_ORDER.includes(route)).map(([route, title, icon, sub, c], i) => (
            <Pressable key={route} onPress={() => navigation.navigate(route)} style={({ pressed }) => pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }}>
              <Grad color={c} from={0.5} to={0.06} radius={16} style={{ width: 168, height: 112, padding: 12, justifyContent: 'space-between' }}>
                <Ionicons name={icon} size={26} color={c} />
                <View><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }}>{title}</Text><Text style={{ color: colors.onSoft, fontSize: 12 }} numberOfLines={2}>{sub}</Text></View>
              </Grad>
            </Pressable>))}
        </ScrollView>
      </View>

    ),
    mine: (
      <View>
      {(mine.length > 0 || mineT.length > 0) && (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }}>{showTeams ? 'Your teams' : 'Your drivers'}</Text>
            {!both ? <Pressable onPress={() => navigation.navigate('Paddock')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit favourites"><Text style={{ color: colors.accentText, fontSize: 13, fontWeight: '700' }}>Edit</Text></Pressable> : null}
            {both ? <Pressable onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity')); const nv = showTeams ? 'drivers' : 'teams'; setMineView(nv); setOpt('homeFirst', nv); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={showTeams ? 'Show your drivers' : 'Show your teams'} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent }, pressed && { opacity: 0.7 }]}><Ionicons name="swap-horizontal" size={15} color={colors.accentText} /><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 13 }}>{showTeams ? 'Drivers' : 'Teams'}</Text></Pressable> : null}
          </View>
          {showTeams ? (
            <ScrollView key="teams" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10 }}>
              {mineT.map((r) => (
                <Pressable key={r.teamId} onPress={() => navigation.navigate('Team', { teamId: r.teamId, name: r.name })} style={({ pressed }) => pressed && { opacity: 0.85 }}>
                  <Grad color={tc(r.teamId)} from={0.6} to={0.08} radius={16} style={{ width: 176, height: 150, overflow: 'hidden' }}>
                    <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ fontFamily: 'display', fontWeight: '800', fontSize: 30, color: colors.fg }}>P{r.position}</Text><TeamBadge teamId={r.teamId} name={r.name} size={44} /></View>
                      <View><Text style={{ color: colors.fg, fontSize: 19, fontWeight: '700' }} numberOfLines={1}>{r.name}</Text><Text style={{ color: colors.onSoft, fontSize: 14 }}>{r.points} pts</Text></View>
                    </View>
                  </Grad>
                </Pressable>))}
            </ScrollView>
          ) : (
            <ScrollView key="drivers" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10 }}>
              {mine.map((r) => { const photo = driverPhoto(r.driverId); const x = lastR.v?.rows?.find((q) => q.driverId === r.driverId); return (
                <Pressable key={r.driverId} onPress={() => openDriver(r)} style={({ pressed }) => pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }}>
                  <Grad color={tc(r.teamId)} from={0.6} to={0.08} radius={16} style={{ width: 176, height: 150, overflow: 'hidden' }}>
                    {photo ? <Image pointerEvents="none" source={photo} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: -14, bottom: -6, width: 150, height: 150 }} /> : null}
                    <LinearGradient pointerEvents="none" colors={[alpha(tc(r.teamId), 0.92), alpha(tc(r.teamId), 0.45), alpha(tc(r.teamId), 0)]} locations={[0, 0.5, 1]} start={{ x: 0, y: 0.6 }} end={{ x: 1, y: 0.2 }} style={StyleSheet.absoluteFill} />
                    <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.85)']} locations={[0, 0.6, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 104 }} />
                    <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: 'display', fontWeight: '800', fontSize: 30, color: colors.fg }}>P{r.position}</Text>
                      <View>
                        <DriverName first={r.first} last={r.last} size={17} />
                        <Text style={{ color: colors.onSoft, fontSize: 14 }}>{r.points} pts</Text>
                        {x ? <Text style={{ color: colors.onSoft, fontSize: 11 }} numberOfLines={1}>{`Last: ${x.positionText && /^[A-Z]$/.test(x.positionText) ? (x.status || 'Out') : `P${x.position}`}`}</Text> : null}
                      </View>
                    </View>
                  </Grad>
                </Pressable>); })}
            </ScrollView>
          )}
        </View>
      )}

      </View>
    ),
    last: (
      <View>
      <LastSession season={season} navigation={navigation} />

      </View>
    ),
    recap: lastR.v ? <RaceRecap race={lastR.v} standings={rows} /> : null,
    rivalry: prefs.opts.rivalry && rows.length ? <RivalryCard pair={prefs.opts.rivalry} rows={rows} onPress={() => navigation.navigate('Rivalry')} /> : null,
    standings: (
      <Card>
        <Eyebrow>Driver standings</Eyebrow>
        {stand.loading && <Skeleton />}
        {stand.error && <ErrorNote error={stand.error} onRetry={stand.reload} />}
        <View style={{ marginTop: 6 }}>
          {rows.slice(0, 5).map((r, i) => (
            <ResultLine key={r.driverId} pos={r.position} first={r.first} last={r.last} color={tc(r.teamId)} fav={favs.isDriver(r.driverId)}
              right={i === 0 ? 'Leader' : `−${rows[0].points - r.points}`} sub={`${r.points} pts`} photoId={r.driverId} logoId={r.teamId} onPress={() => openDriver(r)} />))}
        </View>
        {rows.length > 0 && <Pressable onPress={() => navigation.navigate('Standings')} style={s.more}><Text style={{ color: colors.accentText, fontWeight: '700', fontSize: 16 }}>Full standings</Text><Ionicons name="chevron-forward" size={16} color={colors.accentText} /></Pressable>}
      </Card>
    ),
  };
  ['rivalry', 'mine', 'last', 'recap', 'standings'].forEach((k) => { if (P[k]) P[k] = <SpoilerGuard id="home" label="Results hidden">{P[k]}</SpoilerGuard>; });
  const order = homeOrder(prefs.opts.homeLayout);
  return (
    <Screen>
      <View pointerEvents="none" style={{ position: 'absolute', top: -170, right: -170, width: 420, height: 420 }}>
        {Array.from({ length: 14 }, (_, gi) => { const k = 1 - gi * 0.065; return <View key={gi} style={{ position: 'absolute', width: 420 * k, height: 420 * k, borderRadius: 210 * k, top: 210 * (1 - k), left: 210 * (1 - k), backgroundColor: alpha(colors.accent, 0.02) }} />; })}
      </View>
      <UpdateBanner />
      <BackupNudge />
      {order.map((k, i) => (P[k] && !(k === 'mine' && !mine.length && !mineT.length) ? <Reveal key={k} index={Math.min(i, 5)}>{P[k]}</Reveal> : null))}
    </Screen>
  );
}
const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  gp: { color: colors.fg, fontSize: 30, fontWeight: '800', lineHeight: 34 }, meta: { color: colors.muted, fontSize: 16 }, big: { color: colors.fg, fontSize: 22, fontWeight: '700' },
  pill: { marginLeft: 'auto', color: colors.fg, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, overflow: 'hidden', fontWeight: '600', fontSize: 12 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingVertical: 6 },
});
