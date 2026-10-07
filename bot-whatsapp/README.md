# Bot vendedor para WhatsApp

Un vendedor con IA que atiende el WhatsApp de un negocio las 24 horas:

- **Responde** preguntas sobre productos, precios, envíos, pagos y promociones.
- **Asesora**: pregunta qué busca la persona y le recomienda 1 o 2 opciones con sus motivos.
- **Cierra la venta**: arma el pedido, calcula el total con los precios reales y manda el link de Mercado Pago o los datos para transferir.
- **Junta interesados**: si alguien quiere un turno, una visita o que lo llamen, lo registra para que el equipo lo contacte.
- **Deriva a una persona** ante reclamos o preguntas que no puede resolver, y se queda callado en esa charla.
- **Avisa al dueño por WhatsApp** de cada pedido, interesado o derivación.

Un solo servidor atiende a **varios negocios**: cada cliente al que le vendés el bot es un archivo en `clientes/`.

---

## 1. Probarlo en 2 minutos (sin WhatsApp)

Necesitás Node.js 20.6 o más nuevo y una API key de Claude ([console.anthropic.com](https://console.anthropic.com)).

```bash
cd bot-whatsapp
npm install
cp .env.example .env        # y pegá tu ANTHROPIC_API_KEY
npm run chat -- oso-mates          # demo con la tienda Oso Mates
npm run chat -- ejemplo-estetica   # demo con un centro de estética
```

Escribís como si fueras un cliente y el bot responde igual que lo haría por WhatsApp. Los avisos al dueño aparecen en amarillo. Esta es la demo para mostrarle a un posible cliente: armale su ficha (ver punto 3) y que chatee con su propio bot antes de pagar.

## 2. Conectarlo a WhatsApp

Se usa la **API oficial de WhatsApp Business (Meta Cloud API)**, así que el número no corre riesgo de bloqueo.

1. Entrá a [developers.facebook.com](https://developers.facebook.com), creá una app de tipo **Business** y agregale el producto **WhatsApp**.
2. En *WhatsApp → Configuración de la API* agregá el número del negocio y copiá el **Phone number ID** en `clientes/<negocio>.json` → `whatsapp.phone_number_id`.
   - Ese número no puede estar usándose en la app de WhatsApp común. Para probar podés usar el número de prueba que da Meta.
3. Creá un **token permanente**: *Business Settings → Usuarios del sistema → Agregar → Generar token* con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`. Ponelo en `.env` como `WHATSAPP_TOKEN`.
4. Copiá la **clave secreta de la app** (*Configuración de la app → Básica*) en `WHATSAPP_APP_SECRET`, e inventá una clave para `WHATSAPP_VERIFY_TOKEN`.
5. Subí el servidor a internet (punto 4) y en *WhatsApp → Configuración → Webhook* poné:
   - URL: `https://TU-SERVIDOR/webhook`
   - Token de verificación: el mismo `WHATSAPP_VERIFY_TOKEN`
   - Suscribite al campo **messages**.
6. Mandale un WhatsApp al número y listo.

> Números de Argentina: Meta manda los números como `549...`. Si en modo de prueba el envío falla con "recipient not in allowed list", agregá el número en la lista de destinatarios de prueba tanto con el 9 como sin él.

### Controlar el bot desde el WhatsApp del dueño

El número que pongas en `notificar_a` recibe los avisos y puede mandarle comandos al bot (escribiéndole al número del negocio):

- `#pausa 5492231234567`: el bot deja de contestarle a ese cliente (lo atiende una persona).
- `#bot 5492231234567`: el bot vuelve a atender esa charla (por ejemplo después de una derivación).

> WhatsApp solo deja mandar mensajes libres a quien te escribió en las últimas 24 h. Para que los avisos lleguen siempre, el dueño tiene que haberle escrito al número del negocio en el último día (o hay que pasar los avisos a una plantilla aprobada).

## 3. Sumar un negocio nuevo (un cliente nuevo)

1. Copiá `clientes/oso-mates.json` (venta de productos) o `clientes/ejemplo-estetica.json` (servicios y turnos) con el nombre del negocio, por ejemplo `clientes/inmobiliaria-perez.json`.
2. Completá:

| Campo | Qué va |
|---|---|
| `id`, `nombre`, `rubro`, `descripcion` | Quién es el negocio. |
| `nombre_asistente`, `tono` | Cómo se presenta y cómo habla el bot. |
| `catalogo` | Productos o servicios con `id`, `nombre`, `precio` y opcionalmente `precio_transferencia`, `descripcion`, `link`, `disponible`. |
| `adicionales` | Extras que se suman a un producto (grabado, envoltorio, etc.). |
| `entrega.opciones` | Envío, retiro, turno en el local. `costo: null` = "a confirmar". |
| `pagos` | Alias de transferencia, descuento, variable del token de Mercado Pago, otros medios. |
| `preguntas_frecuentes`, `promociones`, `reglas` | Lo que el bot tiene que saber y respetar de ese negocio. |
| `whatsapp.phone_number_id` | El número de WhatsApp de ese negocio. |
| `whatsapp.token_env` | Variable de `.env` con el token (si el número está en otra cuenta de Meta, usá una variable distinta). |
| `notificar_a` | WhatsApp del dueño para los avisos (formato `549223...`). |

3. Probalo con `npm run chat -- <id>` y ajustá la ficha hasta que responda como el dueño quiere.
4. Reiniciá el servidor.

Los archivos que empiezan con `_` se ignoran (sirve para borradores). Las fichas no llevan contraseñas: todos los tokens van en `.env`.

## 4. Ponerlo online

Cualquier servicio que corra Node.js con una URL https sirve: Railway, Render, Fly.io o un VPS.

- Comando de inicio: `npm start`
- Variables de entorno: las de `.env.example`.
- **Disco persistente** montado en `data/` (o `DIR_DATOS` apuntando a él): ahí quedan las conversaciones, `pedidos.jsonl`, `interesados.jsonl` y `derivaciones.jsonl` de cada negocio. Sin disco persistente se pierden en cada reinicio.
- `GET /salud` responde si el servidor está vivo (sirve para el monitoreo del hosting).

## 5. Costos de funcionamiento

- **Claude**: se cobra por uso. La ficha del negocio se guarda en caché entre mensajes, así que cada respuesta sale bastante más barata que la primera. Como referencia, una conversación de venta completa ronda los centavos de dólar; medilo con tus primeros clientes en la consola de Anthropic para fijar tu precio. Para bajar costos podés poner `CLAUDE_EFFORT=low`.
- **WhatsApp (Meta)**: responder a un cliente que te escribió (dentro de las 24 h) no tiene costo; Meta cobra los mensajes de plantilla que inicia el negocio. Revisá la tabla de precios vigente de Meta para Argentina.
- **Hosting**: desde unos pocos dólares por mes, y un mismo servidor atiende a todos tus clientes.

## Cómo está armado

```
clientes/          una ficha .json por negocio
src/server.js      recibe los mensajes de WhatsApp (webhook) y contesta
src/agente.js      el vendedor: habla con Claude y ejecuta las acciones
src/prompt.js      arma las instrucciones de venta a partir de la ficha
src/herramientas.js crear_pedido, registrar_interesado, derivar_a_humano
src/pagos.js       links de Mercado Pago
src/memoria.js     conversaciones, pedidos e interesados (archivos en data/)
src/cola.js        junta los mensajes que llegan seguidos y responde una vez
src/whatsapp.js    envío de mensajes y validación de la firma de Meta
src/simulador.js   chat de prueba en la terminal
```

- Los totales se calculan en el servidor con los precios de la ficha: el bot nunca inventa un precio.
- Cada mensaje llega validado con la firma de Meta (`WHATSAPP_APP_SECRET`); sin esa clave el servidor rechaza todo (para pruebas locales existe `PERMITIR_SIN_FIRMA=1`).
- Si Claude rechaza un mensaje por sus filtros de seguridad, la API reintenta sola con un modelo de respaldo.

Tests: `npm test`.
