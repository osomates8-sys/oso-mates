import { useLocalSearchParams } from 'expo-router';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';

import { Button, Card, Loading, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { formatDate, formatMoney, whatsappLink } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { statusColors } from '@/lib/theme';
import type { Order, OrderStatus } from '@/lib/types';
import { unwrap, useData } from '@/lib/useData';

const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  pendiente: { status: 'pagado', label: 'Marcar como pagado' },
  pagado: { status: 'entregado', label: 'Marcar como entregado' },
};

export default function PedidoDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { store } = useAuth();

  const { data: order, reload } = useData(
    async () => unwrap(await supabase.from('orders').select('*, order_items(*)').eq('id', id).single()) as Order,
    [id],
  );

  if (!order) return <Loading />;

  const setStatus = async (status: OrderStatus) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id);
    if (error) Alert.alert('Error', error.message);
    else reload();
  };

  const cancel = () =>
    Alert.alert('Cancelar pedido', 'Se devuelve el stock de los productos.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar pedido',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('cancel_order', { p_order_id: order.id });
          if (error) Alert.alert('Error', error.message);
          else reload();
        },
      },
    ]);

  const items = order.order_items ?? [];
  const next = NEXT[order.status];

  const sendWhatsapp = () => {
    const detail = items.map((i) => `• ${i.quantity} x ${i.product_name}`).join('\n');
    const text =
      `¡Hola ${order.customer_name}! Te paso el detalle de tu pedido en ${store?.name ?? 'nuestra tienda'}:\n\n` +
      `${detail}\n\nTotal: ${formatMoney(order.total)}`;
    Linking.openURL(whatsappLink(order.customer_phone!, text));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <Text style={styles.title}>{order.customer_name}</Text>
        <View style={[styles.badge, { backgroundColor: statusColors[order.status] }]}>
          <Text style={styles.badgeText}>{order.status}</Text>
        </View>
      </View>
      <Text style={styles.muted}>
        {order.source === 'web' ? '🌐 Pedido online · ' : ''}
        {formatDate(order.created_at)}
        {order.customer_phone ? ` · ${order.customer_phone}` : ''}
      </Text>
      {order.notes ? <Text style={styles.text}>📝 {order.notes}</Text> : null}

      <Card style={{ gap: 8 }}>
        {items.map((i) => (
          <View key={i.id} style={styles.row}>
            <Text style={[styles.text, { flex: 1 }]}>
              {i.quantity} x {i.product_name}
            </Text>
            <Text style={styles.text}>{formatMoney(i.unit_price * i.quantity)}</Text>
          </View>
        ))}
        <View style={[styles.row, { marginTop: 6 }]}>
          <Text style={styles.subtitle}>Total</Text>
          <Text style={styles.subtitle}>{formatMoney(order.total)}</Text>
        </View>
      </Card>

      {next && <Button title={next.label} onPress={() => setStatus(next.status)} />}
      {order.customer_phone ? (
        <Button variant="secondary" title="Enviar detalle por WhatsApp" onPress={sendWhatsapp} />
      ) : null}
      {order.status !== 'cancelado' && <Button variant="danger" title="Cancelar pedido" onPress={cancel} />}
    </ScrollView>
  );
}
