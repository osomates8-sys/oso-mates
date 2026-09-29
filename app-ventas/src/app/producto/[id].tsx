import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';

import { Button, Field, Loading, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { parseAmount } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function ProductoForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'nuevo';
  const { store } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('0');
  const [threshold, setThreshold] = useState('3');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          Alert.alert('Error', error?.message ?? 'Producto no encontrado');
          router.back();
          return;
        }
        setName(data.name);
        setDescription(data.description ?? '');
        setPrice(String(data.price));
        setCost(data.cost == null ? '' : String(data.cost));
        setStock(String(data.stock));
        setThreshold(String(data.low_stock_threshold));
        setActive(data.active);
        setLoading(false);
      });
  }, [id, isNew]);

  const save = async () => {
    const priceN = parseAmount(price);
    const costN = cost.trim() ? parseAmount(cost) : null;
    const stockN = parseInt(stock, 10);
    const thresholdN = parseInt(threshold, 10);

    if (!name.trim()) return Alert.alert('Falta el nombre');
    if (priceN == null) return Alert.alert('Precio inválido');
    if (cost.trim() && costN == null) return Alert.alert('Costo inválido');
    if (Number.isNaN(stockN) || Number.isNaN(thresholdN)) return Alert.alert('Stock inválido');
    if (!store) return;

    const row = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceN,
      cost: costN,
      stock: stockN,
      low_stock_threshold: thresholdN,
      active,
    };

    setSaving(true);
    const { error } = isNew
      ? await supabase.from('products').insert({ ...row, store_id: store.id })
      : await supabase.from('products').update(row).eq('id', id);
    setSaving(false);

    if (error) Alert.alert('No se pudo guardar', error.message);
    else router.back();
  };

  const remove = () =>
    Alert.alert('Eliminar producto', '¿Seguro? Los pedidos anteriores no se modifican.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) Alert.alert('Error', error.message);
          else router.back();
        },
      },
    ]);

  if (loading) return <Loading />;

  const priceN = parseAmount(price);
  const costN = parseAmount(cost);
  const margin = priceN && costN != null ? Math.round(((priceN - costN) / priceN) * 100) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'Nuevo producto' : 'Editar producto' }} />
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Mate imperial" />
      <Field label="Descripción" value={description} onChangeText={setDescription} multiline />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Precio de venta" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Costo (opcional)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
        </View>
      </View>
      {margin != null && <Text style={styles.muted}>Margen: {margin}%</Text>}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Stock" value={stock} onChangeText={setStock} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Avisar con menos de" value={threshold} onChangeText={setThreshold} keyboardType="number-pad" />
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.text}>Visible en el catálogo</Text>
        <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary }} />
      </View>
      <Button title="Guardar" onPress={save} loading={saving} />
      {!isNew && <Button variant="danger" title="Eliminar" onPress={remove} />}
    </ScrollView>
  );
}
