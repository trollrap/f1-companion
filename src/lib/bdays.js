import { dobOf, firstWinOf, localDriverInfo } from '../api/history';
// Builds the birthday and first-win anniversary reminders for favourite drivers, from the offline history.
export function bdayItems(driverIds) {
  const out = [];
  (driverIds || []).forEach((id) => {
    let nm = id; try { const i = localDriverInfo(id); if (i && i.name) nm = i.name; } catch {}
    const dob = dobOf(id); if (dob && /^\d{4}-\d{2}-\d{2}$/.test(dob)) { const by = Number(dob.slice(0, 4)); out.push({ id: `${id}-b`, md: dob.slice(5), title: `Happy birthday, ${nm}`, body: (y) => `${nm} turns ${y - by} today.` }); }
    const w = firstWinOf(id); if (w && /^\d{4}-\d{2}-\d{2}$/.test(w.date)) out.push({ id: `${id}-w`, md: w.date.slice(5), title: `${nm}: first win anniversary`, body: (y) => `${y - w.year} years ago today ${nm} won a first Grand Prix: the ${w.name}.` });
  });
  return out;
}
