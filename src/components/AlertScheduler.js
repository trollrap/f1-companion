import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSeason } from '../hooks/useSeason';
import { usePrefs } from '../hooks/usePrefs';
import { scheduleSessionAlerts } from '../lib/notifications';
import { checkResults, syncResultTask } from '../lib/resultAlerts';
// Keeps the device's scheduled alerts in step with the next race and the user's preferences, on every launch.
export default function AlertScheduler() {
  const season = useSeason(); const { prefs } = usePrefs();
  useEffect(() => {
    if (season.status !== 'ready' || !season.next) return;
    scheduleSessionAlerts(season.next, season.sessions, prefs).catch(() => {});
  }, [season.status, season.next?.meeting_key, season.sessions, prefs]);
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
