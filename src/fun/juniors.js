// Real young drivers from the junior series and the F1 academies, used for rookies in a fantasy (made-up names are no longer used for them).
// [first, last, nationality, level 55-80 (rough estimate of how good the junior is)]. Estimates for fun, editable in the app.
export const JUNIORS = [
  ['Rafael', 'Câmara', 'Brazil', 78], ['Leonardo', 'Fornaroli', 'Italy', 79], ['Gabriele', 'Minì', 'Italy', 72], ['Dino', 'Beganovic', 'Sweden', 74], ['Luke', 'Browning', 'United Kingdom', 72],
  ['Alex', 'Dunne', 'Ireland', 73], ['Oliver', 'Goethe', 'Germany', 66], ['Sami', 'Meguetounif', 'Algeria', 66], ['Roman', 'Staněk', 'Czech Republic', 69], ['Jak', 'Crawford', 'United States', 72],
  ['Kush', 'Maini', 'India', 70], ['Victor', 'Martins', 'France', 73], ['Richard', 'Verschoor', 'Netherlands', 71], ['Joshua', 'Dürksen', 'Paraguay', 68], ['Cian', 'Shields', 'United Kingdom', 66],
  ['Nikola', 'Tsolov', 'Bulgaria', 75], ['Martinius', 'Stenshorne', 'Norway', 70], ['Laurens', 'van Hoepen', 'Netherlands', 66], ['Noel', 'León', 'Mexico', 66], ['Mari', 'Boya', 'Spain', 67],
  ['Tasanapol', 'Inthraphuvasak', 'Thailand', 62], ['Emerson', 'Fittipaldi Jr.', 'Brazil', 62], ['Ritomo', 'Miyata', 'Japan', 66], ['Brando', 'Badoer', 'Italy', 68], ['Callum', 'Voisin', 'United Kingdom', 66],
  ['Tim', 'Tramnitz', 'Germany', 69], ['Freddie', 'Slater', 'United Kingdom', 69], ['Tuukka', 'Taponen', 'Finland', 70], ['Noah', 'Strømsted', 'Denmark', 66], ['Charlie', 'Wurz', 'Austria', 64],
  ['Mattia', 'Colnaghi', 'Italy', 63], ['Louis', 'Sharp', 'United Kingdom', 62], ['Nicola', 'Lacorte', 'Italy', 64], ['Sebastián', 'Montoya', 'Colombia', 68], ['Rafael', 'Villagómez', 'Mexico', 66],
  ['Max', 'Esterson', 'United States', 64], ['Théophile', 'Naël', 'France', 66], ['Joseph', 'Loake', 'United Kingdom', 63], ['Ugo', 'Ugochukwu', 'United States', 65], ['James', 'Wharton', 'Australia', 66],
  ['Kacper', 'Sztuka', 'Poland', 62], ['Santiago', 'Ramos', 'Mexico', 62], ['Nikita', 'Bedrin', 'Russia', 60], ['Matías', 'Zagazeta', 'Peru', 62], ['Gerrard', 'Xie', 'China', 60],
  ['Christian', 'Mansell', 'United Kingdom', 62], ['Lucas', 'Blakeley', 'United Kingdom', 62], ['Enzo', 'Deligny', 'France', 61], ['Maya', 'Weug', 'Spain', 63], ['Dennis', 'Hauger', 'Norway', 68],
  ['Franco', 'Colapinto', 'Argentina', 76], ['Jüri', 'Vips', 'Estonia', 70], ['Théo', 'Pourchaire', 'France', 74], ['Zane', 'Maloney', 'Barbados', 68], ['Paul', 'Aron', 'Estonia', 70],
  ['Ayumu', 'Iwasa', 'Japan', 72], ['Liam', 'Lawson', 'New Zealand', 76], ['Isack', 'Hadjar', 'France', 75], ['Oliver', 'Bearman', 'United Kingdom', 77], ['Frederik', 'Vesti', 'Denmark', 70],
  ['Logan', 'Sargeant', 'United States', 66], ['Marcus', 'Armstrong', 'New Zealand', 68], ['Clément', 'Novalak', 'France', 66], ['Jack', 'Doohan', 'Australia', 70], ['Felipe', 'Drugovich', 'Brazil', 74],
  ['Enzo', 'Fittipaldi', 'Brazil', 64], ['Juan Manuel', 'Correa', 'United States', 62], ['Arthur', 'Leclerc', 'Monaco', 68], ['Callan', 'O\'Keeffe', 'Australia', 64], ['Kaylen', 'Frederick', 'United Kingdom', 62],
  ['Ido', 'Cohen', 'Israel', 62], ['Niels', 'Koolen', 'Netherlands', 60], ['Pepe', 'Martí', 'Spain', 66], ['Mari', 'Garcia', 'Spain', 60], ['Josh', 'Mason', 'United Kingdom', 60],
];
const DEM = { British: 'United Kingdom', English: 'United Kingdom', Scottish: 'United Kingdom', Welsh: 'United Kingdom', American: 'United States', Italian: 'Italy', French: 'France', German: 'Germany', Spanish: 'Spain', Dutch: 'Netherlands', Belgian: 'Belgium', Brazilian: 'Brazil', Argentine: 'Argentina', Argentinian: 'Argentina', Australian: 'Australia', Austrian: 'Austria', Swiss: 'Switzerland', Swedish: 'Sweden', Finnish: 'Finland', Danish: 'Denmark', Norwegian: 'Norway', Japanese: 'Japan', Canadian: 'Canada', Mexican: 'Mexico', Monegasque: 'Monaco', 'New Zealander': 'New Zealand', 'South African': 'South Africa', Portuguese: 'Portugal', Polish: 'Poland', Russian: 'Russia', Thai: 'Thailand', Chinese: 'China', Indian: 'India', Colombian: 'Colombia', Venezuelan: 'Venezuela', Hungarian: 'Hungary', Czech: 'Czech Republic', Irish: 'Ireland', Uruguayan: 'Uruguay', Chilean: 'Chile' };
export const demonymToCountry = (d) => DEM[d] || d || null;
const key = (a) => `${a[0]} ${a[1]}`.toLowerCase();
// Real drivers of the past who are not in the fantasy yet, as a last resort when every junior is already used (long saves). Needs the offline history.
let HISTORIC = null;
const historic = () => {
  if (HISTORIC) return HISTORIC;
  try { const H = require('../data/history.json'); HISTORIC = H.d.filter((d) => d[1] && d[2] && d[4]).map((d) => [d[1], d[2], d[4], 60]); } catch { HISTORIC = []; }
  return HISTORIC;
};
// A real junior (or, when they are all taken, a real driver from history) whose name is not in `used` (a Set of lower-case full names). Returns [first, last, nationality, level].
export function realRookie(used) {
  const free = JUNIORS.filter((j) => !used.has(key(j)));
  const pool = free.length ? free : historic().filter((j) => !used.has(key(j)));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
