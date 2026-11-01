import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
const Ctx = createContext(null);
export function FavsProvider({ children }) {
  const [f, setF] = useState({ drivers: [], teams: [] });
  useEffect(() => { AsyncStorage.getItem('favs').then((r) => r && setF(JSON.parse(r))).catch(() => {}); }, []);
  const save = (n) => { setF(n); AsyncStorage.setItem('favs', JSON.stringify(n)).catch(() => {}); };
  const flip = (k, id) => save({ ...f, [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id] });
  return <Ctx.Provider value={{ ...f, isDriver: (id) => f.drivers.includes(id), isTeam: (id) => f.teams.includes(id), toggleDriver: (id) => flip('drivers', id), toggleTeam: (id) => flip('teams', id) }}>{children}</Ctx.Provider>;
}
export const useFavs = () => useContext(Ctx);
