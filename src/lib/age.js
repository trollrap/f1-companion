// Age gate for creating a profile. Policy lives in ONE place so it is easy to change after legal advice (see LEGAL.md).
// 16 is the safe single threshold: it covers COPPA (13 in the US) and the highest EU digital-consent age (16) without needing parental consent flows.
export const MIN_AGE = 16;

// Returns { ok: true, age } for a real calendar date in the past, else { ok: false, reason }.
export function checkBirth(dayS, monthS, yearS, now = new Date()) {
  const d = Number(dayS), m = Number(monthS), y = Number(yearS);
  if (![dayS, monthS, yearS].every((x) => /^\d+$/.test(String(x).trim()))) return { ok: false, reason: 'Enter your date of birth as numbers.' };
  if (String(yearS).trim().length !== 4 || y < 1900) return { ok: false, reason: 'Enter the year with four digits.' };
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return { ok: false, reason: 'That date does not exist.' };
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (dt.getTime() > today) return { ok: false, reason: 'That date is in the future.' };
  let age = now.getFullYear() - y;
  if (today < Date.UTC(now.getFullYear(), m - 1, d)) age--;
  return { ok: true, age };
}
export const oldEnough = (age) => age >= MIN_AGE;
