# Bot vendedor para WhatsApp

Un vendedor con IA que atiende el WhatsApp de un negocio las 24 horas:

- **Responde** preguntas sobre productos, precios, envíos, pagos y promociones.
- **Asesora**: pregunta qué busca la persona y le recomienda 1 o 2 opciones con sus motivos.
- **Cierra la venta**: arma el pedido, calcula el total con los precios reales y manda el link de Mercado Pago o los datos para transferir.
- **Junta interesados**: si alguien quiere un turno, una visita o que lo llamen, lo registra para que el equipo lo contacte.
- **Deriva a una persona** ante reclamos o preguntas que no puede resolver, y se queda callado en esa charla.
- **Avisa al dueño por WhatsApp** de cada pedido, interesado o derivación.
- **Entiende audios** (plan Temporada): los pasa a texto y responde como si fueran escritos.

Un solo servidor atiende a **varios negocios**: cada cliente al que le vendés el bot es un archivo en `clientes/`.

---

## 1. Probarlo en 2 minutos (sin WhatsApp)

Necesitás Node.js 20.6 o más nuevo y una API key de Claude ([console.anthropic.com](https://console.anthropic.com)).

```bash
cd bot-whatsapp
npm install
cp .env.example .env        # y pegá tu ANTHROPIC_API_KEY
npm run chat -- oso-mates          # demo con la tienda Oso Mates
npm run chat -- demo-estetica      # demo para centros de estética
npm run chat -- demo-gimnasio      # demo para gimnasios
npm run chat -- demo-inmobiliaria  # demo para inmobiliarias
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

### Plantilla de Meta para los avisos

WhatsApp solo deja mandar texto libre a quien escribió en las últimas 24 h. Para que los avisos lleguen siempre, el bot usa una plantilla aprobada por Meta:

- Si el dueño escribió al número del negocio en las últimas 24 h, el aviso le llega completo como texto.
- Si no, le llega la plantilla con un resumen de una línea, por ejemplo: *"Hola, tenés una novedad en el WhatsApp de tu negocio: nuevo pedido de Ana por $64.800. Tocá Ver detalle o respondé este mensaje para recibir el detalle completo."* El detalle queda guardado y le llega apenas toca el botón o responde cualquier cosa.

Para registrarla (una vez por cada cuenta de WhatsApp Business):

1. Copiá el **ID de la cuenta de WhatsApp Business** (WhatsApp Manager → Configuración de la cuenta) en la ficha: `whatsapp.waba_id`.
2. `npm run plantilla -- oso-mates` la manda a revisión (categoría Utilidad, idioma español de Argentina).
3. `npm run plantilla -- oso-mates --estado` muestra si ya está aprobada. Meta suele aprobarla en minutos.

Las plantillas de utilidad tienen un costo por mensaje que cobra Meta; con este sistema solo se usan cuando el dueño no escribió en el último día.

### Número de demostración (`#demo`)

Un número aparte para que cada comerciante pruebe su bot desde su celular antes de pagar. Sirve el número de prueba gratuito de Meta.

1. En `.env`: `DEMO_PHONE_NUMBER_ID` (el Phone number ID de ese número) y `ADMIN_WHATSAPP` (tu WhatsApp).
2. Armá la ficha del comerciante en `clientes/` (punto 3). No hace falta reiniciar: las fichas se recargan con cada comando.
3. Desde tu WhatsApp, escribile al número de demo:
   - `#demo estetica-sofi 5492231234567`: ese teléfono prueba el bot de esa ficha durante 7 días.
   - `#demo estetica-sofi`: lo probás vos primero.
   - `#demos`: lista las demos activas.
   - `#fin 5492231234567`: termina una demo.
4. Pedile al comerciante que le escriba "hola" al número de demo. Si es el número de prueba de Meta, antes agregá su teléfono como destinatario de prueba (Meta deja hasta 5).

En la demo el bot muestra todas las funciones (incluidos los audios), y después de cada respuesta el comerciante ve el aviso que le llegaría como dueño. Las charlas de demo se guardan aparte y no cuentan para ningún plan. Quien escriba sin demo asignada recibe una presentación corta.

## 3. Sumar un negocio nuevo (un cliente nuevo)

1. Copiá `clientes/oso-mates.json` (venta de productos) o `clientes/demo-estetica.json` (servicios y turnos) con el nombre del negocio, por ejemplo `clientes/inmobiliaria-perez.json`.
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
| `plan` | `inicial`, `vendedor` o `temporada` (definidos en `planes.json`). |
| `whatsapp.phone_number_id` | El número de WhatsApp de ese negocio. Si tiene varias sucursales, una lista: `["111", "222"]`; cada cliente recibe la respuesta desde el número al que escribió. |
| `whatsapp.waba_id` | ID de la cuenta de WhatsApp Business, para registrar la plantilla de avisos. |
| `whatsapp.token_env` | Variable de `.env` con el token (si el número está en otra cuenta de Meta, usá una variable distinta). |
| `notificar_a` | WhatsApp del dueño para los avisos (formato `549223...`). |

3. Probalo con `npm run chat -- <id>` y ajustá la ficha hasta que responda como el dueño quiere.
4. Reiniciá el servidor.

Los archivos que empiezan con `_` se ignoran (sirve para borradores). Las fichas no llevan contraseñas: todos los tokens van en `.env`.

## 4. Planes, cobro e informes

Los planes y precios están en `planes.json` (los mismos de la página de venta). Cada ficha dice su `plan`.

- **Conteo de conversaciones**: una conversación son todos los mensajes con un mismo cliente dentro de 24 horas. Se cuentan por mes en `data/<negocio>/uso/AAAA-MM.json`. Las pruebas con `npm run chat` no cuentan.
- **Avisos al dueño**: cuando llega al 80% y al 100% de su plan le llega un WhatsApp. El bot nunca se corta: lo que pasa del límite se cobra como conversación extra.
- **Panel para vos**: con `ADMIN_CLAVE` en `.env`, entrá a `https://TU-SERVIDOR/admin?clave=TU_CLAVE` y vas a ver, por negocio, conversaciones usadas, extras, abono, total a cobrar y pedidos que cerró el bot. Para otro mes agregá `&mes=2026-10`.
- **Audios**: solo en los planes con `"audios": true` (hoy, Temporada). El bot descarga el audio de WhatsApp, lo transcribe y responde. Hace falta `TRANSCRIPCION_API_KEY` (por defecto OpenAI Whisper; con `TRANSCRIPCION_URL` y `TRANSCRIPCION_MODELO` podés usar Groq u otro servicio compatible, que suele ser más barato). En los otros planes, o si la transcripción falla, el bot pide que lo escriban. Los audios del mes aparecen en el panel y en el informe. Para probar: en `npm run chat` escribí `/audio ruta/al/audio.ogg`.
- **Informe mensual**: resume el uso, los pedidos, lo más pedido, interesados y derivaciones, y le pide a Claude un análisis de las charlas (qué preguntan, por qué se caen ventas, qué no supo responder y sugerencias).
  - Plan Temporada: se genera solo el día 1 y le llega al dueño por WhatsApp.
  - A mano, para cualquier negocio: `npm run informe -- oso-mates 2026-10` (agregá `--enviar` para mandarlo al dueño), o desde el panel: `/admin/informe?clave=TU_CLAVE&cliente=oso-mates&mes=2026-10`.

## 5. Ponerlo online

Cualquier servicio que corra Node.js con una URL https sirve: Railway, Render, Fly.io o un VPS.

- Comando de inicio: `npm start`
- Variables de entorno: las de `.env.example`.
- **Disco persistente** montado en `data/` (o `DIR_DATOS` apuntando a él): ahí quedan las conversaciones, pedidos, interesados, derivaciones, el uso de cada mes y los informes de cada negocio. Sin disco persistente se pierden en cada reinicio, incluido el conteo para cobrar.
- `GET /salud` responde si el servidor está vivo (sirve para el monitoreo del hosting).

## 6. Costos de funcionamiento

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
src/uso.js         conteo de conversaciones por plan y avisos de límite
src/avisos.js      avisos al dueño: texto o plantilla de Meta según la ventana de 24 h
src/plantilla.js   registra la plantilla de avisos en Meta (npm run plantilla)
src/audio.js       descarga y transcripción de audios (planes que los incluyen)
src/demo.js        número de demostración y comandos #demo, #demos, #fin
src/informe.js     informe mensual (también se usa desde la terminal)
planes.json        planes y precios
src/memoria.js     conversaciones, pedidos e interesados (archivos en data/)
src/cola.js        junta los mensajes que llegan seguidos y responde una vez
src/whatsapp.js    envío de mensajes y validación de la firma de Meta
src/simulador.js   chat de prueba en la terminal
```

- Los totales se calculan en el servidor con los precios de la ficha: el bot nunca inventa un precio.
- Cada mensaje llega validado con la firma de Meta (`WHATSAPP_APP_SECRET`); sin esa clave el servidor rechaza todo (para pruebas locales existe `PERMITIR_SIN_FIRMA=1`).
- Si Claude rechaza un mensaje por sus filtros de seguridad, la API reintenta sola con un modelo de respaldo.

Tests: `npm test`.
