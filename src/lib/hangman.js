import { driversMeta } from '../api/history';
import { CIRCUITS } from '../data/circuits';
// Word lists for Hangman, all from data already in the app. Only letters A to Z count as guesses; spaces, dashes and apostrophes are shown.
const plain = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
export function hangmanWord(r) {
  const cat = ['Driver surname', 'Circuit', 'Team'][Math.floor(r() * 3)]; let list = [];
  if (cat === 'Driver surname') list = driversMeta().filter((d) => d.races >= 40 && d.lastYear >= 1990).map((d) => d.last);
  else if (cat === 'Circuit') list = CIRCUITS.map((c) => c.place.split(',')[0]);
  else list = ['Ferrari', 'McLaren', 'Williams', 'Red Bull', 'Mercedes', 'Alpine', 'Aston Martin', 'Haas', 'Sauber', 'Alfa Romeo', 'Renault', 'Lotus', 'Brabham', 'Tyrrell', 'Benetton', 'Jordan', 'Minardi', 'Toro Rosso', 'Force India', 'Racing Point', 'Brawn', 'Jaguar', 'Arrows', 'Ligier', 'Cooper', 'Maserati', 'Honda', 'Toyota', 'BMW Sauber', 'Caterham', 'Marussia', 'Prost', 'Stewart'];
  list = list.filter((w) => w && plain(w).replace(/[^A-Za-z]/g, '').length >= 4 && plain(w).length <= 14);
  const w = list[Math.floor(r() * list.length)]; return { cat, word: w, letters: plain(w).toUpperCase() };
}
