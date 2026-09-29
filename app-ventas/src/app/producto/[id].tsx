import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Button, Field, Loading, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { showError } from '@/lib/errors';
import { parseAmount } from '@/lib/format';
import { deleteProductImage, pickProductImage, uploadProductImage } from '@/lib/images';
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<{ uri: string; mimeType: string } | null>(null);

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
        setImageUrl(data.image_url);
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

    setSaving(true);
    let uploadedUrl: string | null = null;
    if (newImage) {
      try {
        uploadedUrl = await uploadProductImage(store.id, newImage);
      } catch (e: any) {
        setSaving(false);
        return Alert.alert('No se pudo subir la foto', e?.message ?? '');
      }
    }

    const row = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceN,
      cost: costN,
      stock: stockN,
      low_stock_threshold: thresholdN,
      active,
      image_url: uploadedUrl ?? imageUrl,
    };

    const { error } = isNew
      ? await supabase.from('products').insert({ ...row, store_id: store.id })
      : await supabase.from('products').update(row).eq('id', id);
    setSaving(false);

    if (error) {
      await deleteProductImage(uploadedUrl);
      showError('No se pudo guardar', error);
      return;
    }
    if (uploadedUrl) await deleteProductImage(imageUrl);
    router.back();
  };

  const choosePhoto = async () => {
    const picked = await pickProductImage();
    if (picked) setNewImage(picked);
  };

  const remove = () =>
    Alert.alert('Eliminar producto', '¿Seguro? Los pedidos anteriores no se modifican.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) return Alert.alert('Error', error.message);
          await deleteProductImage(imageUrl);
          router.back();
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
      <Pressable onPress={choosePhoto} style={{ alignSelf: 'center', alignItems: 'center', gap: 6 }}>
        {newImage || imageUrl ? (
          <Image source={{ uri: newImage?.uri ?? imageUrl! }} style={{ width: 140, height: 140, borderRadius: 12 }} />
        ) : (
          <View
            style={{
              width: 140,
              height: 140,
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.muted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 32 }}>📷</Text>
          </View>
        )}
        <Text style={{ color: colors.primary, fontWeight: '600' }}>
          {newImage || imageUrl ? 'Cambiar foto' : 'Agregar foto'}
        </Text>
      </Pressable>
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
