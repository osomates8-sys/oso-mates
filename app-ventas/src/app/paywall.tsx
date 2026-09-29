import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { Button, Card, styles } from '@/components/ui';
import { purchasesAvailable, useSubscription } from '@/lib/subscription';
import { colors } from '@/lib/theme';
import { FREE_LIMITS } from '@/lib/types';

const BENEFITS = [
  'Productos ilimitados',
  'Pedidos ilimitados',
  'Reportes de ventas y márgenes',
  'Catálogo online con tu link',
  'Soporte prioritario por WhatsApp',
];

export default function Paywall() {
  const { isPro, packages, purchase, restore } = useSubscription();
  const [busy, setBusy] = useState<string | null>(null);

  const buy = async (pkg: PurchasesPackage) => {
    setBusy(pkg.identifier);
    try {
      if (await purchase(pkg)) {
        Alert.alert('¡Gracias!', 'Ya tenés Vendé Pro.');
        router.back();
      }
    } catch (e: any) {
      Alert.alert('No se pudo completar la compra', e?.message ?? '');
    } finally {
      setBusy(null);
    }
  };

  const doRestore = async () => {
    setBusy('restore');
    try {
      const ok = await restore();
      Alert.alert(ok ? 'Compra restaurada' : 'No encontramos compras', ok ? 'Ya tenés Vendé Pro.' : '');
      if (ok) router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? '');
    } finally {
      setBusy(null);
    }
  };

  if (isPro) {
    return (
      <View style={[styles.screen, styles.content]}>
        <Text style={styles.title}>Ya sos Pro ⭐</Text>
        <Text style={styles.muted}>
          Podés gestionar o cancelar la suscripción desde la App Store o Google Play.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Hacé crecer tu negocio con Pro</Text>
      <Text style={styles.muted}>
        El plan gratis incluye {FREE_LIMITS.products} productos y {FREE_LIMITS.ordersPerMonth} pedidos por
        mes.
      </Text>

      <Card style={{ gap: 8 }}>
        {BENEFITS.map((b) => (
          <Text key={b} style={styles.text}>
            ✅ {b}
          </Text>
        ))}
      </Card>

      {!purchasesAvailable && (
        <Text style={{ color: colors.warning }}>
          Las compras sólo funcionan en iOS/Android con las claves de RevenueCat configuradas.
        </Text>
      )}

      {packages.map((pkg) => (
        <Button
          key={pkg.identifier}
          title={`${pkg.product.title} · ${pkg.product.priceString}`}
          onPress={() => buy(pkg)}
          loading={busy === pkg.identifier}
          disabled={!!busy}
        />
      ))}

      {purchasesAvailable && (
        <Button
          variant="secondary"
          title="Restaurar compras"
          onPress={doRestore}
          loading={busy === 'restore'}
          disabled={!!busy}
        />
      )}
      <Text style={[styles.muted, { fontSize: 12 }]}>
        La suscripción se renueva automáticamente. Podés cancelarla cuando quieras desde la tienda.
      </Text>
    </ScrollView>
  );
}
