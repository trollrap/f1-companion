import { useEffect, useState } from 'react';
import { usePrefs } from '../hooks/usePrefs';
// Spoiler guard: with the setting on, results stay hidden until tapped. What was revealed is remembered until the app is closed.
const revealed = new Set(); const subs = new Set();
export function useSpoilerHidden(id) {
  const { prefs } = usePrefs(); const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return !!prefs.opts.spoiler && !revealed.has(id);
}
export const reveal = (id) => { revealed.add(id); subs.forEach((f) => f()); };
export const hideAll = () => { revealed.clear(); subs.forEach((f) => f()); };
