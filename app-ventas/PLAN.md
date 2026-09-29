# Vendé: plan del MVP

> Nombre provisorio. Una app para que emprendedores que venden por Instagram y WhatsApp manejen stock, pedidos y catálogo desde el celular, con suscripción mensual.

## 1. Problema y cliente

**Cliente:** emprendedor chico (1 a 3 personas) que vende productos físicos por redes sociales: mates, ropa, cosmética, velas, comida. No tiene sistema de gestión, así que anota en cuadernos, en Excel o en los chats.

**Dolores:**
- No sabe cuánto stock le queda, y vende cosas que no tiene.
- No sabe cuánto vendió en el mes ni cuánto gana en cada producto.
- Pierde pedidos entre los chats de WhatsApp.
- Tiene que armar a mano el catálogo con precios cada vez que alguien pregunta.

**Propuesta:** "Tu stock, tus pedidos y tu tienda online, en el celular".

## 2. Modelo de negocio

| Plan | Precio | Qué incluye |
|---|---|---|
| **Gratis** | $0 | Hasta 15 productos y 30 pedidos por mes. Alcanza para probar y engancharse. |
| **Pro mensual** | USD 4,99 (o su equivalente en ARS) | Todo ilimitado, reportes, catálogo online y soporte |
| **Pro anual** | USD 49,99 (2 meses gratis) | Lo mismo que el mensual, y baja las cancelaciones |

- Prueba gratis de **7 días** en el plan Pro, configurada en App Store Connect y Google Play.
- Comisión de las tiendas: **15%** si te anotás en el *Small Business Program* (Apple) y en el esquema de suscripciones de Google.
- **Cuentas para ser rentable:** con 300 suscriptores × USD 4,99 × 0,85 quedan unos **USD 1.270 por mes**. Los costos fijos (Supabase Pro USD 25 y RevenueCat, gratis hasta USD 2.500 de facturación mensual) son chicos. Arriba de unos 30 suscriptores ya cubrís los costos.

## 3. Alcance del MVP (versión 1)

Lo que **ya está programado** en este proyecto:

- [x] Registro y login con email (Supabase Auth). La tienda se crea sola al registrarse.
- [x] **Inicio:** ventas del mes, cantidad de pedidos, pendientes, ticket promedio y alertas de stock bajo.
- [x] **Productos:** alta, edición y baja, precio, costo con margen calculado, stock, umbral de alerta y buscador.
- [x] **Pedidos:** alta con selector de productos, descuento automático de stock, estados (pendiente → pagado → entregado), cancelación que devuelve el stock, filtros y envío del detalle por WhatsApp.
- [x] **Ajustes:** nombre del negocio, link de la tienda, WhatsApp y un botón para **compartir el catálogo** como texto.
- [x] **Suscripción:** paywall con RevenueCat, límites del plan gratis, restaurar compras.
- [x] Seguridad: RLS en Postgres, así que cada usuario sólo ve sus datos y el plan no se puede modificar desde la app.
- [x] **Webhook de RevenueCat → Supabase** (Edge Function) que actualiza `stores.plan`. Los límites del plan gratis se validan también en la base.
- [x] **Fotos de productos** (Supabase Storage, cada tienda sólo escribe en su carpeta).
- [x] **Catálogo web público** con carrito. Los pedidos entran directo a la app en tiempo real y descuentan stock, con WhatsApp como alternativa. En el plan gratis lleva la marca "Creado con Vendé", que funciona como publicidad.

Lo que falta para **publicar** (en orden):

1. [ ] Crear el proyecto en Supabase y correr `supabase/schema.sql`.
2. [ ] Crear las suscripciones en App Store Connect y Google Play Console.
3. [ ] Configurar RevenueCat: productos, un *entitlement* `pro` y un *offering* por defecto.
4. [ ] Publicar la función `revenuecat` y cargar el webhook en RevenueCat (ver README).
5. [ ] Publicar `catalogo-web/` en un hosting estático y cargar `EXPO_PUBLIC_CATALOG_URL`.
6. [ ] Ícono, splash, nombre final y capturas para las tiendas.
7. [ ] Política de privacidad y términos (las tiendas los exigen para apps con suscripción).
8. [ ] Builds con EAS (`eas build`) y envío a revisión (`eas submit`).

## 4. Roadmap después del lanzamiento

| Versión | Funcionalidad | Por qué |
|---|---|---|
| 1.1 | **Notificaciones push** de pedidos nuevos, aunque la app esté cerrada (expo-notifications + Edge Function) | Hoy el aviso sólo aparece con la app abierta |
| 1.1 | Captcha en el catálogo si aparece spam (Cloudflare Turnstile) | Ya hay límites por hora, esto sería el siguiente paso |
| 1.1 | Dominio propio para el catálogo (Pro) | Otro motivo para pagar |
| 1.2 | Clientes: historial de compras y recordatorio de recompra | Retención |
| 1.2 | Reporte mensual: productos más vendidos y ganancia neta | Valor del plan Pro |
| 1.3 | Cobros con link de Mercado Pago dentro del pedido | Diferencial local |
| 1.3 | Variantes (talle, color) | Lo piden los que venden ropa |
| 2.0 | Multiusuario (empleados) y plan "Negocio" más caro | Sube el ingreso por cliente |

## 5. Arquitectura

```
Catálogo web (HTML estático) ── public_catalog() ──┐
                                                    ▼
App (Expo / React Native, iOS + Android + web)
 ├── Expo Router: navegación por archivos en src/app
 ├── Supabase JS: login + base de datos Postgres con RLS
 └── RevenueCat: suscripciones de App Store / Google Play
          │ webhook
          ▼
Supabase Edge Function → actualiza stores.plan
```

**Modelo de datos** (`supabase/schema.sql`):

- `stores`: una por usuario (nombre, slug del link, whatsapp, plan).
- `products`: precio, costo, stock, umbral de stock bajo, activo.
- `orders`: cliente, estado, total, notas y origen (`app` o `web`). `order_items` guarda el nombre y el precio al momento de la venta.
- `create_order()` crea el pedido y descuenta stock en una sola transacción. `cancel_order()` devuelve el stock.
- `public_catalog(slug)`: catálogo público en JSON, sin datos sensibles (ni costos ni stock exacto).
- `place_web_order(slug, …)`: pedido desde el catálogo (sin login), con validaciones y límites anti-abuso. Comparte la lógica con `create_order` a través de `_insert_order`, que no es accesible desde afuera.
- `enforce_free_limits()`: trigger que corta en 15 productos y 30 pedidos por mes si la tienda es `free`.
- Bucket `product-images`: lectura pública; cada tienda escribe sólo en `<store_id>/`.

## 6. Métricas a seguir

- **Activación:** % de registrados que cargan 3 o más productos y 1 pedido en la primera semana.
- **Conversión a Pro:** meta de 3 a 5% de los activos.
- **Cancelaciones mensuales (churn):** meta menor al 6%.
- **Pedidos cargados por usuario por semana:** es la señal de que la app se volvió un hábito.

## 7. Cómo validar antes de invertir más

1. Usala vos con Oso Mates durante 2 semanas.
2. Pasásela gratis a 10 emprendedores conocidos y mirá si la siguen usando a los 14 días.
3. Recién ahí publicala y activá el cobro.
