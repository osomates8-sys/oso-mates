import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Loading } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { SubscriptionProvider } from '@/lib/subscription';
import { colors } from '@/lib/theme';

function RootNavigator() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;

  const loggedIn = !!session;
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!loggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="producto/[id]" options={{ title: 'Producto', presentation: 'modal' }} />
        <Stack.Screen name="pedido/nuevo" options={{ title: 'Nuevo pedido', presentation: 'modal' }} />
        <Stack.Screen name="pedido/[id]" options={{ title: 'Pedido' }} />
        <Stack.Screen name="paywall" options={{ title: 'Vendé Pro', presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SubscriptionProvider>
    </AuthProvider>
  );
}
