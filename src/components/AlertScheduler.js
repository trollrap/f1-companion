import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSeason } from '../hooks/useSeason';
import { alertSessions, currentSeason, events as motoEvents } from '../api/motogp';
import { usePrefs } from '../hooks/usePrefs';
import { scheduleSessionAlerts } from '../lib/notifications';
import { checkResults, syncResultTask } from '../lib/resultAlerts';
// Keeps the device's scheduled alerts in step with the next race and the user's preferences, on every launch.
export default function AlertScheduler() {
  const season = useSeason(); const { prefs } = usePrefs();
  const moto = prefs.opts.sport === 'motogp';
  useEffect(() => {
    if (moto) return;
    if (season.status !== 'ready' || !season.next) return;
    scheduleSessionAlerts(season.next, season.sessions, prefs).catch(() => {});
  }, [moto, season.status, season.next?.meeting_key, season.sessions, prefs]);
  // MotoGP mode: alerts follow the next MotoGP weekend instead (one sport at a time).
  useEffect(() => {
    if (!moto) return undefined; let dead = false;
    (async () => {
      const s = await currentSeason(); if (!s || dead) return;
      const next = (await motoEvents(s.id, s.year)).find((e) => Date.parse(e.end) >= Date.now()); if (!next || dead) return;
      const list = await alertSessions(next, s.id); if (dead) return;
      await scheduleSessionAlerts({ meeting_name: next.name, meeting_key: next.id }, list, prefs);
    })().catch(() => {});
    return () => { dead = true; };
  }, [moto, prefs]);
  // Results alerts: background task on or off with the switch, plus a check at launch and whenever the app comes back to the front.
  useEffect(() => {
    syncResultTask(prefs.results);
    if (!prefs.results) return undefined;
    checkResults().catch(() => {});
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') checkResults().catch(() => {}); });
    return () => sub.remove();
  }, [prefs.results]);
  return null;
}
