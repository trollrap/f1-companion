import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { successor } from '../data/lineage';
const Ctx = createContext(null);
export function FavsProvider({ children }) {
  const [f, setF] = useState({ drivers: [], teams: [] });
  useEffect(() => { AsyncStorage.getItem('favs').then((r) => r && setF(JSON.parse(r))).catch(() => {}); }, []);
  const save = (n) => { setF(n); AsyncStorage.setItem('favs', JSON.stringify(n)).catch(() => {}); };
  // A team favourited under an old name (Toro Rosso, Racing Point...) counts as favourite for the team that carries it today, so it shows as a current team.
  const teamOn = (id) => f.teams.includes(id) || f.teams.some((t) => successor[t] === id);
  const flip = (k, id) => {
    if (k === 'teams') { const on = teamOn(id); save({ ...f, teams: on ? f.teams.filter((x) => x !== id && successor[x] !== id) : [...f.teams, id] }); return; }
    save({ ...f, [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id] });
  };
  return <Ctx.Provider value={{ ...f, isDriver: (id) => f.drivers.includes(id), isTeam: teamOn, toggleDriver: (id) => flip('drivers', id), toggleTeam: (id) => flip('teams', id) }}>{children}</Ctx.Provider>;
}
export const useFavs = () => useContext(Ctx);
