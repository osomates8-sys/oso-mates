import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { Button, Field, styles } from '@/components/ui';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || password.length < 6) {
      Alert.alert('Revisá los datos', 'Ingresá tu email y una contraseña de al menos 6 caracteres.');
      return;
    }
    setBusy(true);
    const { data, error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);

    if (error) Alert.alert('No se pudo ingresar', error.message);
    else if (mode === 'signup' && !data.session)
      Alert.alert('Revisá tu email', 'Te mandamos un link para confirmar la cuenta.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { justifyContent: 'center' }]}
    >
      <View style={[styles.content, { gap: 16 }]}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: colors.primary }}>Vendé</Text>
        <Text style={styles.muted}>Tu stock, tus pedidos y tu tienda online, en el celular.</Text>

        {!isSupabaseConfigured && (
          <Text style={{ color: colors.danger }}>
            Falta configurar Supabase: copiá .env.example como .env.local y completá las claves.
          </Text>
        )}

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        <Button title={mode === 'login' ? 'Ingresar' : 'Crear cuenta'} onPress={submit} loading={busy} />
        <Button
          variant="secondary"
          title={mode === 'login' ? '¿No tenés cuenta? Registrate' : 'Ya tengo cuenta'}
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
