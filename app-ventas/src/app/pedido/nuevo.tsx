import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Card, Empty, Field, Loading, styles } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { Product } from '@/lib/types';
import { unwrap, useData } from '@/lib/useData';

export default function NuevoPedido() {
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const { data: products } = useData(async () =>
    unwrap(await supabase.from('products').select('*').eq('active', true).order('name')) as Product[],
  );

  if (!products) return <Loading />;

  const change = (id: string, delta: number) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }));

  const items = products.filter((p) => (qty[p.id] ?? 0) > 0);
  const total = items.reduce((sum, p) => sum + p.price * qty[p.id], 0);

  const save = async () => {
    if (!customer.trim()) return Alert.alert('Falta el nombre del cliente');
    if (!items.length) return Alert.alert('Agregá al menos un producto');

    const overStock = items.filter((p) => qty[p.id] > p.stock);
    if (overStock.length) {
      const ok = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'Stock insuficiente',
          `${overStock.map((p) => p.name).join(', ')} quedará con stock negativo. ¿Registrar igual?`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Registrar', onPress: () => resolve(true) },
          ],
        ),
      );
      if (!ok) return;
    }

    setSaving(true);
    const { data: orderId, error } = await supabase.rpc('create_order', {
      p_customer_name: customer.trim(),
      p_customer_phone: phone.trim() || null,
      p_notes: notes.trim() || null,
      p_items: items.map((p) => ({ product_id: p.id, quantity: qty[p.id] })),
    });
    setSaving(false);

    if (error) return Alert.alert('No se pudo guardar', error.message);
    router.replace({ pathname: '/pedido/[id]', params: { id: orderId as string } });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label="Cliente" value={customer} onChangeText={setCustomer} placeholder="Nombre" />
      <Field label="Teléfono (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} placeholder="Envío, seña, etc." />

      <Text style={[styles.subtitle, { marginTop: 8 }]}>Productos</Text>
      {products.length === 0 && <Empty title="No hay productos activos" />}
      {products.map((p) => (
        <Card key={p.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.text}>{p.name}</Text>
            <Text style={styles.muted}>
              {formatMoney(p.price)} · stock {p.stock}
            </Text>
          </View>
          <Stepper value={qty[p.id] ?? 0} onChange={(d) => change(p.id, d)} />
        </Card>
      ))}

      <Card style={styles.row}>
        <Text style={styles.subtitle}>Total</Text>
        <Text style={styles.title}>{formatMoney(total)}</Text>
      </Card>
      <Button title="Registrar pedido" onPress={save} loading={saving} />
    </ScrollView>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (delta: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <StepButton label="−" onPress={() => onChange(-1)} />
      <Text style={[styles.subtitle, { minWidth: 20, textAlign: 'center' }]}>{value}</Text>
      <StepButton label="+" onPress={() => onChange(1)} />
    </View>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
