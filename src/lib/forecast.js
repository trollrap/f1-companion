import { cachedJSON } from './cache';
const HOUR = 3600e3, DAY = 86400e3;
// Session-by-session forecast from Open-Meteo (no key). Returns { by: {sessionName: {t, rain, wind}} }, { far: true } when the weekend is over two weeks away, or {}.
export async function forecastFor(location, country, sessions) {
  const geo = await cachedJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=5&language=en`, 30 * DAY);
  const g = (geo.results || []).find((x) => country && String(x.country || '').toLowerCase().startsWith(String(country).toLowerCase().slice(0, 5))) || (geo.results || [])[0]; if (!g) return {};
  const t0 = Math.min(...sessions.map((s) => Date.parse(s.date_start))), t1 = Math.max(...sessions.map((s) => Date.parse(s.date_end)));
  const day = (ms) => new Date(ms).toISOString().slice(0, 10);
  if (t0 - Date.now() > 15 * DAY) return { far: true };
  const a = day(Math.max(t0, Date.now() - 2 * DAY)), b = day(Math.max(t1, Date.now()));
  const w = await cachedJSON(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&hourly=temperature_2m,precipitation_probability,wind_speed_10m&timezone=UTC&start_date=${a}&end_date=${b}`, HOUR);
  const H = w.hourly; if (!H) return {}; const ix = {}; H.time.forEach((t, i) => { ix[t] = i; });
  const out = {}; sessions.forEach((s) => { const mid = (Date.parse(s.date_start) + Date.parse(s.date_end)) / 2; const k = new Date(Math.round(mid / HOUR) * HOUR).toISOString().slice(0, 13) + ':00'; const i = ix[k]; if (i != null) out[s.session_name] = { t: Math.round(H.temperature_2m[i]), rain: H.precipitation_probability[i], wind: Math.round(H.wind_speed_10m[i]) }; });
  return { by: out };
}
