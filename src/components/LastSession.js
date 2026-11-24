import React from 'react';
import { View, Image } from 'react-native';
import Skeleton from './Skeleton';
import { Text } from './Text';
import { Card, Eyebrow, Note, ErrorNote } from './Screen';
import { ResultLine, ResultRow, TeamBadge } from './Shared';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useSeason';
import { useTeamColor } from '../hooks/useTeams';
import { lastRace, sessionResults, driverStandings } from '../api/jolpica';
import { sessionClassification, sessionBestLaps, YEAR } from '../api/openf1';
import { shortName } from '../lib/time';
import { driverPhoto } from '../lib/media';
import { colors, alpha } from '../theme';

const KIND = { Race: 'results', Qualifying: 'qualifying', Sprint: 'sprint' };
// The most recent session that has finished: a session of the current race weekend if there is one, otherwise the last race.
export default function LastSession({ season, navigation }) {
  const now = useNow(60000); const tc = useTeamColor();
  const ended = (season.sessions || []).filter((x) => Date.parse(x.date_end) < now).sort((a, b) => Date.parse(a.date_end) - Date.parse(b.date_end));
  const s = season.next ? ended.at(-1) : null; const meeting = s ? season.next : null;
  // Newest finished session first. A session whose results are not published yet (or whose request is slow) is skipped after a few seconds and the
  // previous one is tried, so the card shows something useful instead of waiting or staying empty; the last race is the final fallback.
  const cands = s ? ended.slice(-4).reverse() : [];
  const res = useAsync(async () => {
    const quick = (p, ms = 7000) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
    const lastRaceCard = async () => { const l = await lastRace(YEAR); return l ? { title: 'Race', gp: l.name, round: l.round, kind: 'race', rows: l.rows.slice(0, 3) } : null; };
    if (!s) return lastRaceCard();
    const ids = await quick(driverStandings(YEAR).catch(() => []), 5000) || [];
    for (const c of cands) {
      const base = { title: c.session_name, gp: meeting.meeting_name, round: Number(meeting.round) }; const kind = KIND[c.session_name]; let rows = null;
      if (kind) rows = await quick(sessionResults(YEAR, meeting.round, kind).catch(() => null));
      else if (c.session_key) {
        rows = await quick(sessionClassification(c.session_key).catch(() => []));
        if (!rows || !rows.length) rows = await quick(sessionBestLaps(c.session_key).catch(() => []), 9000);
        rows = (rows || []).map((r) => { const m = ids.find((x) => String(x.permNumber) === String(r.number)) || ids.find((x) => x.last && r.last && x.last.toLowerCase() === r.last.toLowerCase()); return { ...r, driverId: m?.driverId, teamId: m?.teamId }; });
      }
      if (rows && rows.length) return { ...base, kind: kind ? (kind === 'qualifying' ? 'quali' : 'race') : 'timing', rows: rows.slice(0, 3) };
    }
    return { title: cands[0]?.session_name || 'Session', gp: meeting.meeting_name, round: Number(meeting.round), kind: 'none', rows: [] };
  }, [s?.session_name, meeting?.meeting_key]);
  const d = res.v;
  const open = () => { const m = d && (season.races || []).find((r) => Number(r.round) === d.round); if (m) navigation.navigate('Round', { meeting: m }); };
  return (
    <Card onPress={d ? open : undefined} flat={d && d.kind === 'race' && d.rows.length >= 3}>
      {d && d.kind === 'race' && d.rows.length >= 3 ? <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}><Text style={{ color: colors.fg, fontSize: 18, fontWeight: '800' }}>{d.title === 'Race' ? `Last race · ${shortName(d.gp)}` : `Last ${d.title.toLowerCase()} · ${shortName(d.gp)}`}</Text><Text style={{ color: colors.accentText, fontSize: 14, fontWeight: '700' }}>Full result</Text></View> : <Eyebrow right="Results">{d ? `Last session · ${d.title}` : 'Last session'}</Eyebrow>}
      {res.loading && <Skeleton />}
      {res.error && <ErrorNote error={res.error} onRetry={res.reload} />}
      {d && (
        <>
          {d.kind === 'race' && d.rows.length >= 3 ? null : <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '700', marginTop: 12, marginBottom: 2 }}>{shortName(d.gp)}</Text>}
          {!d.rows.length ? <Note>The results are not published yet.</Note> : null}
          {d.kind === 'race' && d.rows.length >= 3 ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1.6, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', minHeight: 170 }}>
                {driverPhoto(d.rows[0].driverId) ? <Image pointerEvents="none" source={driverPhoto(d.rows[0].driverId)} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', left: -6, bottom: -4, width: 118, height: 150 }} /> : null}
                <View style={{ flex: 1, paddingLeft: 112, paddingRight: 12, paddingTop: 14, paddingBottom: 12, justifyContent: 'space-between' }}>
                  <View style={{ alignItems: 'flex-start' }}>
                    <Text style={{ color: colors.gold, fontSize: 11, letterSpacing: 2.2, fontWeight: '800' }}>WINNER</Text>
                    {d.rows[0].grid > 0 ? <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{`from P${d.rows[0].grid}`}</Text> : null}
                  </View>
                  <View>
                    {d.rows[0].first ? <Text style={{ color: alpha(colors.fg, 0.6), fontSize: 14, fontWeight: '300', letterSpacing: 1 }} numberOfLines={1}>{String(d.rows[0].first).toUpperCase()}</Text> : null}
                    <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '900', lineHeight: 25 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{String(d.rows[0].last || '').toUpperCase()}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <TeamBadge teamId={d.rows[0].teamId} name={d.rows[0].team} size={22} />
                      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{d.rows[0].team}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={{ flex: 1.15, gap: 10 }}>
                {d.rows.slice(1, 3).map((r) => (
                  <View key={r.position} style={{ flex: 1, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', minHeight: 80 }}>
                    {driverPhoto(r.driverId) ? <Image pointerEvents="none" source={driverPhoto(r.driverId)} resizeMode="cover" resizeMethod="resize" fadeDuration={0} style={{ position: 'absolute', right: -6, bottom: -6, width: 62, height: 72 }} /> : null}
                    <View style={{ flex: 1, padding: 10, paddingRight: 58, justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: colors.fg, fontSize: 13, fontWeight: '800' }}>{`P${r.position}`}</Text>
                        {r.time ? <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>{String(r.time)}</Text> : null}
                      </View>
                      <View>
                        {r.first ? <Text style={{ color: alpha(colors.fg, 0.6), fontSize: 11, fontWeight: '300', letterSpacing: 0.8 }} numberOfLines={1}>{String(r.first).toUpperCase()}</Text> : null}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: colors.fg, fontSize: 15, fontWeight: '900', flexShrink: 1 }} numberOfLines={1}>{String(r.last || '').toUpperCase()}</Text>
                          <TeamBadge teamId={r.teamId} name={r.team} size={16} />
                        </View>
                      </View>
                    </View>
                  </View>))}
              </View>
            </View>
          ) : null}
          {d.kind === 'race' && d.rows.length < 3 && d.rows.map((r) => <ResultRow key={r.position} r={r} photo />)}
          {d.kind === 'quali' && d.rows.map((r) => <ResultLine key={r.position} pos={r.position} first={r.first} last={r.last} color={tc(r.teamId)} photoId={r.driverId} logoId={r.teamId} right={r.q3 || r.q2 || r.q1 || '—'} sub={r.q3 ? 'Q3' : r.q2 ? 'Q2' : 'Q1'} />)}
          {d.kind === 'timing' && d.rows.map((r) => <ResultLine key={r.position} pos={r.position} first={r.first} last={r.last} color={r.color || colors.muted} photoId={r.driverId} logoId={r.teamId} right={r.time} sub={r.gap || r.team} />)}
        </>)}
    </Card>
  );
}
