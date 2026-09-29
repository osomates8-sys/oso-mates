import { router } from 'expo-router';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { useAuth } from './auth';
import { supabase } from './supabase';

type LiveOrders = {
  // Pedidos del catálogo web que todavía están pendientes (para el badge).
  pendingWeb: number;
  // Cambia cada vez que hay un cambio en los pedidos; las pantallas lo usan para recargar.
  version: number;
};

const LiveOrdersContext = createContext<LiveOrders>({ pendingWeb: 0, version: 0 });

// Escucha los pedidos en tiempo real (Supabase Realtime) y avisa cuando entra uno del catálogo web.
export function LiveOrdersProvider({ children }: { children: ReactNode }) {
  const { store } = useAuth();
  const storeId = store?.id;
  const [pendingWeb, setPendingWeb] = useState(0);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!storeId) return;

    const refreshCount = async () => {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('source', 'web')
        .eq('status', 'pendiente');
      setPendingWeb(count ?? 0);
    };
    refreshCount();

    const channel = supabase
      .channel(`orders-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        (payload) => {
          setVersion((v) => v + 1);
          refreshCount();

          const order = payload.new as { id?: string; source?: string; customer_name?: string };
          if (payload.eventType === 'INSERT' && order.source === 'web' && order.id) {
            Alert.alert('🛍️ Nuevo pedido online', `${order.customer_name} hizo un pedido desde tu catálogo.`, [
              { text: 'Después', style: 'cancel' },
              { text: 'Ver', onPress: () => router.push({ pathname: '/pedido/[id]', params: { id: order.id! } }) },
            ]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  return <LiveOrdersContext.Provider value={{ pendingWeb, version }}>{children}</LiveOrdersContext.Provider>;
}

export const useLiveOrders = () => useContext(LiveOrdersContext);
