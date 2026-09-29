import { Link } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Card, Loading, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { formatMoney, startOfMonth } from '@/lib/format';
import { useLiveOrders } from '@/lib/live';
import { useSubscription } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import { FREE_LIMITS, type Order, type Product } from '@/lib/types';
import { unwrap, useData } from '@/lib/useData';

export default function Dashboard() {
  const { store } = useAuth();
  const { isPro } = useSubscription();
  const { version, pendingWeb } = useLiveOrders();

  const { data, refreshing, reload } = useData(async () => {
    const [orders, products] = await Promise.all([
      supabase.from('orders').select('status, total').gte('created_at', startOfMonth()).then(unwrap),
      supabase.from('products').select('id, name, stock, low_stock_threshold, active').then(unwrap),
    ]);
    return {
      orders: orders as Pick<Order, 'status' | 'total'>[],
      products: products as Pick<Product, 'id' | 'name' | 'stock' | 'low_stock_threshold' | 'active'>[],
    };
  }, [version]);

  if (!data) return <Loading />;

  const valid = data.orders.filter((o) => o.status !== 'cancelado');
  const sales = valid.reduce((sum, o) => sum + Number(o.total), 0);
  const pending = data.orders.filter((o) => o.status === 'pendiente').length;
  const lowStock = data.products.filter((p) => p.active && p.stock <= p.low_stock_threshold);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
    >
      <Text style={styles.title}>Hola{store ? `, ${store.name}` : ''} 👋</Text>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Ventas del mes" value={formatMoney(sales)} />
        <Stat label="Pedidos del mes" value={String(valid.length)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Pendientes" value={String(pending)} color={pending ? colors.warning : undefined} />
        <Stat label="Ticket promedio" value={formatMoney(valid.length ? sales / valid.length : 0)} />
      </View>

      {pendingWeb > 0 && (
        <Link href="/pedidos" asChild>
          <Pressable>
            <Card style={{ borderColor: colors.primary, backgroundColor: '#E8F3E9' }}>
              <Text style={styles.subtitle}>
                🛍️ {pendingWeb} {pendingWeb === 1 ? 'pedido online nuevo' : 'pedidos online nuevos'}
              </Text>
              <Text style={styles.muted}>Entraron desde tu catálogo web. Tocá para verlos →</Text>
            </Card>
          </Pressable>
        </Link>
      )}

      {!isPro && (
        <Link href="/paywall" asChild>
          <Pressable>
            <Card style={{ borderColor: colors.primary }}>
              <Text style={styles.subtitle}>Plan gratis</Text>
              <Text style={styles.muted}>
                {data.products.length}/{FREE_LIMITS.products} productos · {data.orders.length}/
                {FREE_LIMITS.ordersPerMonth} pedidos este mes. Pasate a Pro para no tener límites →
              </Text>
            </Card>
          </Pressable>
        </Link>
      )}

      <Text style={[styles.subtitle, { marginTop: 8 }]}>Stock bajo</Text>
      {lowStock.length === 0 ? (
        <Text style={styles.muted}>Todo en orden 👌</Text>
      ) : (
        lowStock.map((p) => (
          <Link key={p.id} href={{ pathname: '/producto/[id]', params: { id: p.id } }} asChild>
            <Pressable>
              <Card style={styles.row}>
                <Text style={styles.text}>{p.name}</Text>
                <Text style={{ color: p.stock <= 0 ? colors.danger : colors.warning, fontWeight: '700' }}>
                  {p.stock <= 0 ? 'Sin stock' : `Quedan ${p.stock}`}
                </Text>
              </Card>
            </Pressable>
          </Link>
        ))
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={{ flex: 1, gap: 4 }}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.title, color ? { color } : null]}>{value}</Text>
    </Card>
  );
}
