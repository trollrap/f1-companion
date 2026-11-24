import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import Skeleton from './Skeleton';
import { Text } from './Text';
import { Card, Eyebrow, Note } from './Screen';
import { ResultLine } from './Shared';
import { useTeamColor } from '../hooks/useTeams';
import { sessionResults, driverStandings } from '../api/jolpica';
import { sessionClassification, YEAR } from '../api/openf1';
import { colors, alpha } from '../theme';

const KIND = { Race: 'results', Qualifying: 'qualifying', Sprint: 'sprint', 'Sprint Qualifying': null, 'Sprint Shootout': null };
// Results of one finished session shown right on the weekend screen: top ten, with a button for the full page.
export default function WeekendResults({ meeting, session, onFull }) {
  const tc = useTeamColor(); const [st, setSt] = useState({ loading: true, rows: [], kind: 'race' });
  useEffect(() => {
    let dead = false; setSt({ loading: true, rows: [], kind: 'race' });
    const quick = (p, ms = 8000) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
    (async () => {
      let rows = null, kind = 'race'; const k = KIND[session.session_name];
      if (k) { rows = await quick(sessionResults(meeting.year || YEAR, meeting.round, k).catch(() => null)); kind = k === 'qualifying' ? 'quali' : 'race'; }
      if ((!rows || !rows.length) && session.session_key) {
        const ids = await quick(driverStandings(meeting.year || YEAR).catch(() => []), 5000) || [];
        const t = await quick(sessionClassification(session.session_key).catch(() => []));
        rows = (t || []).map((r) => { const m = ids.find((x) => String(x.permNumber) === String(r.number)) || ids.find((x) => x.last && r.last && x.last.toLowerCase() === r.last.toLowerCase()); return { ...r, driverId: m?.driverId, teamId: m?.teamId, first: r.first || m?.first, last: r.last || m?.last }; }); kind = 'timing';
      }
      if (!dead) setSt({ loading: false, rows: (rows || []).slice(0, 10), kind });
    })();
    return () => { dead = true; };
  }, [session.session_name, meeting.meeting_key]);
  const { rows, kind, loading } = st;
  return (
    <Card>
      <Eyebrow right={session.session_name}>Results</Eyebrow>
      {loading ? <Skeleton /> : null}
      {!loading && !rows.length ? <Note>The results are not published yet. They appear here as soon as they are.</Note> : null}
      {rows.map((r, i) => (
        <ResultLine key={`${r.position}-${i}`} pos={r.position} first={r.first} last={r.last} color={r.color || tc(r.teamId) || colors.muted} photoId={r.driverId} logoId={r.teamId}
          right={kind === 'quali' ? (r.q3 || r.q2 || r.q1 || '') : (r.time || r.status || '')} sub={kind === 'race' && r.grid > 0 ? `Started P${r.grid}` : undefined} />))}
      {rows.length ? <Pressable onPress={onFull} accessibilityRole="button" style={({ pressed }) => [{ marginTop: 12, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: alpha(colors.accent, 0.16), borderWidth: 1, borderColor: alpha(colors.accent, 0.45) }, pressed && { opacity: 0.8 }]}><Text style={{ color: colors.fg, fontWeight: '700', fontSize: 15 }}>Full results and grid</Text></Pressable> : null}
    </Card>
  );
}
