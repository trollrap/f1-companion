import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Football teams the user follows, kept on the phone (by ESPN team id).
export function useFootFavs() {
  const [ids, setIds] = useState([]);
  useEffect(() => { AsyncStorage.getItem('footFavs').then((r) => r && setIds(JSON.parse(r))).catch(() => {}); }, []);
  const toggle = useCallback((id) => setIds((p) => { const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]; AsyncStorage.setItem('footFavs', JSON.stringify(n)).catch(() => {}); return n; }), []);
  return { ids, has: (id) => ids.includes(id), toggle };
}
