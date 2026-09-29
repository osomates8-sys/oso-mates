# Vendé

App móvil (iOS y Android) para que emprendedores manejen stock, pedidos y catálogo, con suscripción mensual. Está hecha con **Expo (React Native)**, **Supabase** y **RevenueCat**.

La idea de negocio, los precios y el roadmap están en [`PLAN.md`](./PLAN.md).

## Cómo correrla

1. Instalá dependencias:
   ```bash
   cd app-ventas
   npm install
   ```
2. Creá un proyecto gratis en [supabase.com](https://supabase.com). En **SQL Editor** pegá y ejecutá [`supabase/schema.sql`](./supabase/schema.sql).
3. Copiá `.env.example` como `.env.local` y completá la URL y la *anon key* de Supabase (Project Settings → API).
4. Levantá la app:
   ```bash
   npx expo start
   ```
   Escaneá el QR con **Expo Go** en el celular, o apretá `w` para abrirla en el navegador.

> Las compras dentro de la app necesitan un *development build*, porque RevenueCat usa código nativo: `npx expo run:android`, `npx expo run:ios` o `npx eas-cli build --profile development`. En Expo Go y en web la app funciona igual, pero sin cobros.

## Configurar la suscripción

1. En App Store Connect y en Google Play Console creá una suscripción mensual y una anual.
2. En [RevenueCat](https://www.revenuecat.com):
   - Conectá las dos tiendas y cargá los productos.
   - Creá un *entitlement* llamado **`pro`** y asignale los productos.
   - Creá un *offering* por defecto con los paquetes mensual y anual.
3. Poné las API keys públicas en `.env.local` (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`).

## Estructura

```
src/
  app/                  pantallas (Expo Router: cada archivo es una ruta)
    _layout.tsx         providers + rutas protegidas por login
    login.tsx
    (tabs)/             Inicio, Productos, Pedidos, Ajustes
    producto/[id].tsx   alta/edición de producto ("nuevo" para crear)
    pedido/nuevo.tsx    registrar venta
    pedido/[id].tsx     detalle, cambio de estado, WhatsApp
    paywall.tsx         planes Pro
  lib/
    supabase.ts         cliente de Supabase
    auth.tsx            sesión y tienda del usuario
    subscription.tsx    RevenueCat: ¿es Pro?, comprar, restaurar
    types.ts            tipos y límites del plan gratis
  components/ui.tsx     botones, inputs, tarjetas
supabase/schema.sql     tablas, seguridad (RLS) y funciones
```

## Comandos útiles

```bash
npm run typecheck                 # chequeo de tipos
npx expo export                   # compila los bundles (sirve para verificar)
npx eas-cli build -p all          # builds para las tiendas
```
