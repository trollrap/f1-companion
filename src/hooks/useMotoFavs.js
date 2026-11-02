import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// MotoGP riders the user follows (by the timing service's rider id), kept on the phone.
export function useMotoFavs() {
  const [ids, setIds] = useState([]);
  useEffect(() => { AsyncStorage.getItem('motoFavs').then((r) => r && setIds(JSON.parse(r))).catch(() => {}); }, []);
  const toggle = useCallback((id) => setIds((p) => { const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]; AsyncStorage.setItem('motoFavs', JSON.stringify(n)).catch(() => {}); return n; }), []);
  return { ids, has: (id) => ids.includes(id), toggle };
}
