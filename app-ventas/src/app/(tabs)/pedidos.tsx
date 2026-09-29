import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Card, Empty, Loading, styles } from '@/components/ui';
import { formatDate, formatMoney, startOfMonth } from '@/lib/format';
import { useLiveOrders } from '@/lib/live';
import { useSubscription } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { colors, statusColors } from '@/lib/theme';
import { FREE_LIMITS, ORDER_STATUSES, type Order, type OrderStatus } from '@/lib/types';
import { unwrap, useData } from '@/lib/useData';

export default function Pedidos() {
  const { isPro } = useSubscription();
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos');
  const { version } = useLiveOrders();

  const { data, refreshing, reload } = useData(async () =>
    unwrap(
      await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
    ) as Order[],
    [version],
  );

  if (!data) return <Loading />;

  const visible = filter === 'todos' ? data : data.filter((o) => o.status === filter);

  const add = () => {
    const monthStart = startOfMonth();
    const thisMonth = data.filter((o) => o.created_at >= monthStart).length;
    if (!isPro && thisMonth >= FREE_LIMITS.ordersPerMonth) router.push('/paywall');
    else router.push('/pedido/nuevo');
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={visible}
        keyExtractor={(o) => o.id}
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(['todos', ...ORDER_STATUSES] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setFilter(s)}
                style={[
                  styles.badge,
                  { paddingVertical: 7, backgroundColor: filter === s ? colors.primary : colors.border },
                ]}
              >
                <Text style={[styles.badgeText, { color: filter === s ? '#fff' : colors.text }]}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        }
        ListEmptyComponent={<Empty title="No hay pedidos" subtitle="Registrá cada venta con “+ Pedido”." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: item.id } })}>
            <Card style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.subtitle}>
                  {item.customer_name}
                  {item.source === 'web' ? <Text style={styles.muted}>  🌐 Web</Text> : null}
                </Text>
                <Text style={styles.muted}>
                  {formatDate(item.created_at)} · {formatMoney(item.total)}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColors[item.status] }]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </Card>
          </Pressable>
        )}
      />
      <Pressable style={styles.fab} onPress={add}>
        <Text style={styles.fabText}>+ Pedido</Text>
      </Pressable>
    </View>
  );
}
