import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { useAuth } from './auth';
import { supabase } from './supabase';

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

// Le pide al servidor que consulte RevenueCat y actualice stores.plan.
// El webhook hace lo mismo, pero esto evita esperar unos segundos después de comprar.
async function syncPlanOnServer() {
  const { error } = await supabase.functions.invoke('revenuecat', { method: 'POST' });
  if (error) console.warn('No se pudo sincronizar el plan:', error.message);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session, store, refreshStore } = useAuth();
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

  // Si RevenueCat dice Pro pero la base todavía no, sincronizamos
  // (por ejemplo, si el webhook aún no llegó).
  const storePlan = store?.plan;
  useEffect(() => {
    if (!entitled || !storePlan || storePlan === 'pro') return;
    syncPlanOnServer().then(refreshStore);
  }, [entitled, storePlan, refreshStore]);

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
    await syncPlanOnServer().then(refreshStore);
    return hasPro(info);
  }, [refreshStore]);

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
