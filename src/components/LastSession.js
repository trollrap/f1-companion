import React from 'react';
import { View } from 'react-native';
import Skeleton from './Skeleton';
import { Text } from './Text';
import { Card, Eyebrow, Note, ErrorNote } from './Screen';
import { ResultLine, ResultRow } from './Shared';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useSeason';
import { useTeamColor } from '../hooks/useTeams';
import { lastRace, sessionResults } from '../api/jolpica';
import { sessionClassification, YEAR } from '../api/openf1';
import { shortName } from '../lib/time';
import { colors } from '../theme';

const KIND = { Race: 'results', Qualifying: 'qualifying', Sprint: 'sprint' };
// The most recent session that has finished: a session of the current race weekend if there is one, otherwise the last race.
export default function LastSession({ season, navigation }) {
  const now = useNow(60000); const tc = useTeamColor();
  const ended = (season.sessions || []).filter((x) => Date.parse(x.date_end) < now).sort((a, b) => Date.parse(a.date_end) - Date.parse(b.date_end));
  const s = season.next ? ended.at(-1) : null; const meeting = s ? season.next : null;
  const res = useAsync(async () => {
    if (!s) { const l = await lastRace(YEAR); return l ? { title: 'Race', gp: l.name, round: l.round, kind: 'race', rows: l.rows.slice(0, 3) } : null; }
    const base = { title: s.session_name, gp: meeting.meeting_name, round: Number(meeting.round) };
    const kind = KIND[s.session_name];
    if (kind) { const rows = await sessionResults(YEAR, meeting.round, kind).catch(() => null); return { ...base, kind: kind === 'qualifying' ? 'quali' : 'race', rows: (rows || []).slice(0, 3) }; }
    if (s.session_key) { const rows = await sessionClassification(s.session_key).catch(() => []); return { ...base, kind: 'timing', rows: rows.slice(0, 3) }; }
    return { ...base, kind: 'none', rows: [] };
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
          {d.kind === 'timing' && d.rows.map((r) => <ResultLine key={r.position} pos={r.position} first={r.first} last={r.last} color={r.color || colors.muted} right={r.time} sub={r.gap || r.team} />)}
        </>)}
    </Card>
  );
}
