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

### Webhook: RevenueCat → Supabase

La función [`supabase/functions/revenuecat`](./supabase/functions/revenuecat/index.ts) actualiza `stores.plan` (`free`/`pro`). La base usa ese dato para aplicar los límites del plan gratis, así que sin este paso los usuarios que pagan seguirían limitados.

1. Instalá la [CLI de Supabase](https://supabase.com/docs/guides/cli) y vinculá el proyecto: `supabase link --project-ref TU-PROYECTO`.
2. Cargá los secretos:
   ```bash
   supabase secrets set REVENUECAT_SECRET_API_KEY=sk_xxx          # RevenueCat → API keys → Secret key (v1)
   supabase secrets set REVENUECAT_WEBHOOK_AUTH="Bearer <una-clave-larga-inventada>"
   ```
3. Publicá la función (sin verificación de JWT, porque RevenueCat no manda uno):
   ```bash
   supabase functions deploy revenuecat --no-verify-jwt
   ```
4. En RevenueCat → Integrations → **Webhooks**:
   - URL: `https://TU-PROYECTO.supabase.co/functions/v1/revenuecat`
   - Authorization header: exactamente el mismo valor que pusiste en `REVENUECAT_WEBHOOK_AUTH`.

La app también llama a esta función justo después de comprar o restaurar, así el plan se activa al instante.

## Catálogo web (link de la tienda)

[`catalogo-web/`](./catalogo-web) es una página liviana, sin dependencias, donde los clientes ven los productos, arman el carrito y mandan el pedido por WhatsApp. El link de cada tienda es `https://tu-dominio/?t=<link-de-la-tienda>`.

1. Completá `catalogo-web/config.js` con la URL y la anon key de Supabase.
2. Publicá la carpeta en cualquier hosting estático gratis: Netlify (arrastrás la carpeta), Vercel, Cloudflare Pages o GitHub Pages.
3. Poné esa dirección en `.env.local` como `EXPO_PUBLIC_CATALOG_URL`. La app va a mostrar el link en **Ajustes** para compartirlo.

En el plan gratis el catálogo muestra "Creado con Vendé" al pie, lo que sirve como publicidad. En Pro, no.

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
    images.ts           elegir y subir fotos de productos
    errors.ts           avisos de límites del plan gratis
    supabase.ts         cliente de Supabase
    auth.tsx            sesión y tienda del usuario
    subscription.tsx    RevenueCat: ¿es Pro?, comprar, restaurar
    types.ts            tipos y límites del plan gratis
  components/ui.tsx     botones, inputs, tarjetas
supabase/
  schema.sql            tablas, seguridad (RLS), límites, fotos y funciones
  functions/revenuecat/ webhook que sincroniza el plan
catalogo-web/           catálogo público para los clientes
```

## Comandos útiles

```bash
npm run typecheck                 # chequeo de tipos
npx expo export                   # compila los bundles (sirve para verificar)
npx eas-cli build -p all          # builds para las tiendas
```
