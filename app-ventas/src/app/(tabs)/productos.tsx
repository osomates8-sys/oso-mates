import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';

import { Card, Empty, Loading, styles } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { useSubscription } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import { FREE_LIMITS, type Product } from '@/lib/types';
import { unwrap, useData } from '@/lib/useData';

export default function Productos() {
  const { isPro } = useSubscription();
  const [search, setSearch] = useState('');

  const { data, refreshing, reload } = useData(async () =>
    unwrap(await supabase.from('products').select('*').order('name')) as Product[],
  );

  if (!data) return <Loading />;

  const q = search.trim().toLowerCase();
  const visible = q ? data.filter((p) => p.name.toLowerCase().includes(q)) : data;

  const add = () => {
    if (!isPro && data.length >= FREE_LIMITS.products) router.push('/paywall');
    else router.push({ pathname: '/producto/[id]', params: { id: 'nuevo' } });
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
        ListHeaderComponent={
          <TextInput
            placeholder="Buscar producto"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.input}
          />
        }
        ListEmptyComponent={
          <Empty title="Todavía no cargaste productos" subtitle="Tocá “+ Producto” para empezar." />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/producto/[id]', params: { id: item.id } })}>
            <Card style={[styles.row, !item.active && { opacity: 0.5 }]}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={{ width: 44, height: 44, borderRadius: 8 }} />
              ) : null}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.subtitle}>{item.name}</Text>
                <Text style={styles.muted}>{formatMoney(item.price)}</Text>
              </View>
              <Text
                style={{
                  fontWeight: '700',
                  color:
                    item.stock <= 0
                      ? colors.danger
                      : item.stock <= item.low_stock_threshold
                        ? colors.warning
                        : colors.text,
                }}
              >
                {item.stock} u.
              </Text>
            </Card>
          </Pressable>
        )}
      />
      <Pressable style={styles.fab} onPress={add}>
        <Text style={styles.fabText}>+ Producto</Text>
      </Pressable>
    </View>
  );
}
