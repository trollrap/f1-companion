import React from 'react';
import { View } from 'react-native';
import Skeleton from './Skeleton';
import { Text } from './Text';
import { Card, Eyebrow, Note, ErrorNote } from './Screen';
import { ResultLine, ResultRow } from './Shared';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useSeason';
import { useTeamColor } from '../hooks/useTeams';
import { lastRace, sessionResults, driverStandings } from '../api/jolpica';
import { sessionClassification, YEAR } from '../api/openf1';
import { shortName } from '../lib/time';
import { colors } from '../theme';

const KIND = { Race: 'results', Qualifying: 'qualifying', Sprint: 'sprint' };
// The most recent session that has finished: a session of the current race weekend if there is one, otherwise the last race.
export default function LastSession({ season, navigation }) {
  const now = useNow(60000); const tc = useTeamColor();
  const ended = (season.sessions || []).filter((x) => Date.parse(x.date_end) < now).sort((a, b) => Date.parse(a.date_end) - Date.parse(b.date_end));
  const s = season.next ? ended.at(-1) : null; const meeting = s ? season.next : null;
  // Newest finished session first. A session whose results are not published yet (or whose request is slow) is skipped after a few seconds and the
  // previous one is tried, so the card shows something useful instead of waiting or staying empty; the last race is the final fallback.
  const cands = s ? ended.slice(-3).reverse() : [];
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
        rows = (rows || []).map((r) => { const m = ids.find((x) => String(x.permNumber) === String(r.number)) || ids.find((x) => x.last && r.last && x.last.toLowerCase() === r.last.toLowerCase()); return { ...r, driverId: m?.driverId, teamId: m?.teamId }; });
      }
      if (rows && rows.length) return { ...base, kind: kind ? (kind === 'qualifying' ? 'quali' : 'race') : 'timing', rows: rows.slice(0, 3) };
    }
    return (await quick(lastRaceCard(), 9000)) || { title: cands[0]?.session_name || 'Session', gp: meeting.meeting_name, round: Number(meeting.round), kind: 'none', rows: [] };
  }, [s?.session_name, meeting?.meeting_key]);
  const d = res.v;
  const open = () => { const m = d && (season.races || []).find((r) => Number(r.round) === d.round); if (m) navigation.navigate('Round', { meeting: m }); };
  return (
    <Card onPress={d ? open : undefined}>
      <Eyebrow right="Results">{d ? `Last session · ${d.title}` : 'Last session'}</Eyebrow>
      {res.loading && <Skeleton />}
      {res.error && <ErrorNote error={res.error} onRetry={res.reload} />}
      {d && (
        <>
          <Text style={{ color: colors.fg, fontSize: 22, fontWeight: '700', marginTop: 12, marginBottom: 2 }}>{shortName(d.gp)}</Text>
          {!d.rows.length ? <Note>The results are not published yet.</Note> : null}
          {d.kind === 'race' && d.rows.map((r) => <ResultRow key={r.position} r={r} photo />)}
          {d.kind === 'quali' && d.rows.map((r) => <ResultLine key={r.position} pos={r.position} first={r.first} last={r.last} color={tc(r.teamId)} photoId={r.driverId} logoId={r.teamId} right={r.q3 || r.q2 || r.q1 || '—'} sub={r.q3 ? 'Q3' : r.q2 ? 'Q2' : 'Q1'} />)}
          {d.kind === 'timing' && d.rows.map((r) => <ResultLine key={r.position} pos={r.position} first={r.first} last={r.last} color={r.color || colors.muted} photoId={r.driverId} logoId={r.teamId} right={r.time} sub={r.gap || r.team} />)}
        </>)}
    </Card>
  );
}
