import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

// Carga datos cada vez que la pantalla vuelve a estar visible
// (por ejemplo, al volver de crear un producto).
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, ...deps]),
  );

  return { data, error, refreshing, reload };
}

// Tira el error de Supabase para que useData lo capture.
export function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}
