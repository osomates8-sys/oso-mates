import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, Text } from 'react-native';

import { Button, Card, Field, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import { useSubscription } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function Ajustes() {
  const { session, store, refreshStore, signOut } = useAuth();
  const { isPro } = useSubscription();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!store) return;
    setName(store.name);
    setSlug(store.slug);
    setWhatsapp(store.whatsapp ?? '');
  }, [store]);

  const save = async () => {
    if (!store) return;
    const cleanSlug = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(cleanSlug)) {
      Alert.alert('Link inválido', 'Usá sólo letras minúsculas, números y guiones (3 a 40 caracteres).');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('stores')
      .update({ name: name.trim() || 'Mi tienda', slug: cleanSlug, whatsapp: whatsapp.trim() || null })
      .eq('id', store.id);
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo guardar', error.code === '23505' ? 'Ese link ya está en uso.' : error.message);
      return;
    }
    await refreshStore();
    Alert.alert('Listo', 'Datos guardados.');
  };

  // Arma el catálogo como texto para pegar en WhatsApp o Instagram.
  const shareCatalog = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('name, price, stock')
      .eq('active', true)
      .order('name');
    if (error) return Alert.alert('Error', error.message);
    if (!data.length) return Alert.alert('Sin productos', 'Cargá productos activos para compartir el catálogo.');

    const lines = data.map((p) => `• ${p.name} — ${formatMoney(p.price)}${p.stock <= 0 ? ' (sin stock)' : ''}`);
    const contact = store?.whatsapp ? `\n\nPedidos por WhatsApp: ${store.whatsapp}` : '';
    await Share.share({ message: `🛍️ ${store?.name ?? 'Catálogo'}\n\n${lines.join('\n')}${contact}` });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={{ gap: 6 }}>
        <Text style={styles.subtitle}>Tu plan: {isPro ? 'Pro ⭐' : 'Gratis'}</Text>
        {!isPro && <Button title="Pasarme a Pro" onPress={() => router.push('/paywall')} />}
      </Card>

      <Text style={[styles.subtitle, { marginTop: 8 }]}>Tu negocio</Text>
      <Field label="Nombre" value={name} onChangeText={setName} />
      <Field label="Link de la tienda" value={slug} onChangeText={setSlug} autoCapitalize="none" />
      <Field
        label="WhatsApp (con código de país, ej. 5491122334455)"
        value={whatsapp}
        onChangeText={setWhatsapp}
        keyboardType="phone-pad"
      />
      <Button title="Guardar" onPress={save} loading={saving} />
      <Button variant="secondary" title="Compartir catálogo" onPress={shareCatalog} />

      <Text style={[styles.muted, { marginTop: 16 }]}>Sesión: {session?.user.email}</Text>
      <Button variant="danger" title="Cerrar sesión" onPress={signOut} />
      <Text style={[styles.muted, { textAlign: 'center', color: colors.muted }]}>Vendé v1.0</Text>
    </ScrollView>
  );
}
