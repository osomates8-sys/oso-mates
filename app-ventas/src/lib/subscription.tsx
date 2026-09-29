import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { useAuth } from './auth';

// Nombre del "entitlement" que configurás en el panel de RevenueCat.
export const PRO_ENTITLEMENT = 'pro';

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

// En web o sin claves cargadas la app funciona igual, sólo que sin cobros.
export const purchasesAvailable = Platform.OS !== 'web' && !!apiKey;

let configured = false;

type SubscriptionState = {
  isPro: boolean;
  packages: PurchasesPackage[];
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
};

const SubscriptionContext = createContext<SubscriptionState | null>(null);

const hasPro = (info: CustomerInfo) => PRO_ENTITLEMENT in info.entitlements.active;

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session, store } = useAuth();
  const [entitled, setEntitled] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const userId = session?.user.id;

  useEffect(() => {
    if (!purchasesAvailable || configured) return;
    Purchases.configure({ apiKey: apiKey! });
    configured = true;
  }, []);

  // Vincula la compra al usuario de Supabase, así el plan lo sigue entre dispositivos.
  useEffect(() => {
    if (!purchasesAvailable) return;
    const onUpdate = (info: CustomerInfo) => setEntitled(hasPro(info));
    Purchases.addCustomerInfoUpdateListener(onUpdate);

    (async () => {
      try {
        if (userId) {
          const { customerInfo } = await Purchases.logIn(userId);
          setEntitled(hasPro(customerInfo));
          const offerings = await Purchases.getOfferings();
          setPackages(offerings.current?.availablePackages ?? []);
        } else {
          setEntitled(false);
          // Falla si el usuario ya era anónimo; en ese caso no hay nada que cerrar.
          await Purchases.logOut().catch(() => {});
        }
      } catch (e) {
        console.warn('RevenueCat:', e);
      }
    })();

    return () => {
      Purchases.removeCustomerInfoUpdateListener(onUpdate);
    };
  }, [userId]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setEntitled(hasPro(customerInfo));
      return hasPro(customerInfo);
    } catch (e: any) {
      if (!e?.userCancelled) throw e;
      return false;
    }
  }, []);

  const restore = useCallback(async () => {
    const info = await Purchases.restorePurchases();
    setEntitled(hasPro(info));
    return hasPro(info);
  }, []);

  // El plan guardado en la base (lo escribe el webhook) también cuenta, así funciona en web.
  const isPro = entitled || store?.plan === 'pro';

  return (
    <SubscriptionContext.Provider value={{ isPro, packages, purchase, restore }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription debe usarse dentro de <SubscriptionProvider>');
  return ctx;
}
