import { router } from 'expo-router';
import { Alert } from 'react-native';

// Errores que lanza enforce_free_limits() en la base cuando se llega al tope del plan gratis.
const LIMITS: Record<string, string> = {
  LIMIT_PRODUCTS: 'Llegaste al máximo de productos del plan gratis.',
  LIMIT_ORDERS: 'Llegaste al máximo de pedidos del mes del plan gratis.',
};

// Muestra el error al usuario. Si es un límite del plan, ofrece pasarse a Pro.
export function showError(title: string, error: { message: string }) {
  const code = Object.keys(LIMITS).find((k) => error.message.includes(k));
  if (!code) {
    Alert.alert(title, error.message);
    return;
  }
  Alert.alert('Plan gratis', LIMITS[code], [
    { text: 'Ahora no', style: 'cancel' },
    { text: 'Ver Pro', onPress: () => router.push('/paywall') },
  ]);
}
