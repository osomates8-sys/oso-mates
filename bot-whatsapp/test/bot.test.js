import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DIR_DATOS = fs.mkdtempSync(path.join(os.tmpdir(), "bot-test-"));

const { cargarClientes } = await import("../src/config.js");
const { calcularPedido, ejecutarHerramienta } = await import("../src/herramientas.js");
const { armarPrompt } = await import("../src/prompt.js");
const { extraerMensajes, firmaValida, partirTexto } = await import("../src/whatsapp.js");
const { obtenerConversacion, estaPausada, leerLineas } = await import("../src/memoria.js");

const clientes = cargarClientes();
const oso = clientes.get("oso-mates");

test("carga los negocios de ejemplo", () => {
  assert.ok(oso);
  assert.ok(clientes.get("demo-estetica"));
});

test("el prompt no cambia entre llamadas (para aprovechar la caché)", () => {
  for (const c of clientes.values()) assert.equal(armarPrompt(c), armarPrompt(c));
  assert.match(armarPrompt(oso), /\[ranchero\] Mate Ranchero/);
});

test("precio de transferencia, adicionales y envío gratis", () => {
  const r = calcularPedido(oso, {
    items: [{ producto_id: "ranchero", cantidad: 2, adicionales: ["grabado"], detalle: "Papá" }],
    entrega_id: "envio-pais",
    forma_pago: "transferencia",
  });
  // 2 x 55.800 + 2 x 9.000 = 129.600 -> supera 100.000, envío gratis
  assert.equal(r.subtotal, 129600);
  assert.equal(r.costoEntrega, 0);
  assert.equal(r.total, 129600);
});

test("precio de lista con Mercado Pago y envío a confirmar", () => {
  const r = calcularPedido(oso, { items: [{ producto_id: "criollo", cantidad: 1 }], entrega_id: "envio-pais", forma_pago: "mercadopago" });
  assert.equal(r.total, 33000);
  assert.equal(r.costoEntrega, null);
  assert.match(r.resumen, /envío a confirmar/);
});

test("rechaza productos inexistentes con un error que el bot entiende", async () => {
  const conv = obtenerConversacion("oso-mates", "5491111111111");
  const r = await ejecutarHerramienta(
    "crear_pedido",
    { items: [{ producto_id: "termo", cantidad: 1 }], nombre_cliente: "Ana", entrega_id: "retiro-mdp", forma_pago: "transferencia" },
    { cliente: oso, conv, notificar: async () => {} },
  );
  assert.equal(r.error, true);
  assert.match(r.contenido, /No existe el producto/);
});

test("crear_pedido guarda el pedido y avisa al dueño", async () => {
  const conv = obtenerConversacion("oso-mates", "5492222222222");
  const avisos = [];
  const r = await ejecutarHerramienta(
    "crear_pedido",
    { items: [{ producto_id: "galleta", cantidad: 1 }], nombre_cliente: "Juan", entrega_id: "retiro-mdp", forma_pago: "transferencia" },
    { cliente: oso, conv, notificar: async (t) => avisos.push(t) },
  );
  assert.equal(r.error, false);
  assert.match(r.contenido, /\$31\.500/);
  assert.equal(avisos.length, 1);
  assert.equal(leerLineas("oso-mates", "pedidos.jsonl").at(-1).nombre_cliente, "Juan");
});

test("derivar_a_humano pausa la conversación", async () => {
  const conv = obtenerConversacion("oso-mates", "5493333333333");
  await ejecutarHerramienta("derivar_a_humano", { motivo: "reclamo", resumen: "llegó roto" }, { cliente: oso, conv, notificar: async () => {} });
  assert.equal(estaPausada(conv), true);
});

test("lee mensajes del webhook de Meta", () => {
  const aviso = {
    entry: [{ changes: [{ value: {
      metadata: { phone_number_id: "123" },
      contacts: [{ profile: { name: "Ana" } }],
      messages: [
        { from: "5492230000000", id: "wamid.1", type: "text", text: { body: "hola" } },
        { from: "5492230000000", id: "wamid.2", type: "audio", audio: {} },
      ],
    } }] }],
  };
  const m = extraerMensajes(aviso);
  assert.equal(m.length, 2);
  assert.deepEqual([m[0].phoneNumberId, m[0].texto, m[0].nombre], ["123", "hola", "Ana"]);
  assert.match(m[1].texto, /audio/);
});

test("valida la firma de Meta", () => {
  const cuerpo = Buffer.from('{"a":1}');
  const firma = "sha256=" + crypto.createHmac("sha256", "secreto").update(cuerpo).digest("hex");
  assert.equal(firmaValida(cuerpo, firma, "secreto"), true);
  assert.equal(firmaValida(cuerpo, firma, "otro"), false);
  assert.equal(firmaValida(cuerpo, undefined, "secreto"), false);
  assert.equal(firmaValida(cuerpo, firma, undefined), false);
});

test("parte los textos largos", () => {
  const partes = partirTexto("a".repeat(9000));
  assert.ok(partes.every((p) => p.length <= 4000));
  assert.equal(partes.join("").length, 9000);
});

const { registrarConversacion, resumenUso, mesDe, leerUso } = await import("../src/uso.js");
const { clientePorNumero } = await import("../src/config.js");
const { generarInforme, mesAnterior } = await import("../src/informe.js");
const { agregarLinea } = await import("../src/memoria.js");

test("cuenta una conversación por cliente cada 24 horas", async () => {
  const c = { ...oso, id: "uso-24h", plan: "vendedor" };
  const conv = { telefono: "5494444444444" };
  const t0 = Date.UTC(2026, 9, 10, 15);
  assert.equal(await registrarConversacion(c, conv, async () => {}, t0), true);
  assert.equal(await registrarConversacion(c, conv, async () => {}, t0 + 3600_000), false);
  assert.equal(await registrarConversacion(c, conv, async () => {}, t0 + 25 * 3600_000), true);
  assert.equal(leerUso("uso-24h", mesDe(new Date(t0))).conversaciones, 2);
});

test("avisa al dueño al 80% y al 100% del plan y calcula los extras", async () => {
  const c = { ...oso, id: "uso-limite", plan: "inicial" }; // 150 conversaciones
  const avisos = [];
  const t0 = Date.UTC(2026, 9, 10, 15);
  for (let i = 0; i < 155; i++) await registrarConversacion(c, { telefono: `54911${i}` }, async (t) => avisos.push(t), t0);
  assert.equal(avisos.length, 2);
  assert.match(avisos[0], /120 de 150/);
  assert.match(avisos[1], /150 de 150/);
  const u = resumenUso(c, mesDe(new Date(t0)));
  assert.deepEqual([u.conversaciones, u.extras, u.montoExtras, u.abono], [155, 5, 1500, 79000]);
});

test("un negocio con varias sucursales se encuentra por cualquiera de sus números", () => {
  const m = new Map([["x", { id: "x", whatsapp: { phone_number_id: ["111", "222"] } }], ["y", { id: "y", whatsapp: { phone_number_id: "333" } }]]);
  assert.equal(clientePorNumero(m, "222").id, "x");
  assert.equal(clientePorNumero(m, "333").id, "y");
  assert.equal(clientePorNumero(m, "999"), null);
});

test("el informe mensual junta uso, pedidos y lo más pedido", async () => {
  const c = { ...oso, id: "informe-test", plan: "temporada" };
  const fecha = "2026-09-15T15:00:00.000Z";
  agregarLinea(c.id, "pedidos.jsonl", { fecha, total: 64800, lineas: [{ nombre: "Mate Ranchero", cantidad: 1 }, { nombre: "Grabado", cantidad: 1 }] });
  agregarLinea(c.id, "pedidos.jsonl", { fecha, total: 33000, lineas: [{ nombre: "Mate Ranchero", cantidad: 2 }] });
  agregarLinea(c.id, "pedidos.jsonl", { fecha: "2026-08-01T15:00:00.000Z", total: 1, lineas: [] });
  agregarLinea(c.id, "interesados.jsonl", { fecha, interes: "turno" });
  const { texto } = await generarInforme(c, "2026-09", { analizarCharlas: false });
  assert.match(texto, /Pedidos cerrados por el bot: 2 \(\$97\.800\)/);
  assert.match(texto, /Interesados para seguimiento: 1/);
  assert.match(texto, /Mate Ranchero: 3/);
  assert.match(texto, /plan Temporada/);
  assert.equal(mesAnterior(new Date("2026-01-15T15:00:00Z")), "2025-12");
});

const { avisarDueno, mensajeDelDueno, limpiarResumen } = await import("../src/avisos.js");

// Simula la API de WhatsApp: guarda lo que se manda y puede responder con error de ventana cerrada.
function whatsappFalso({ ventanaCerrada = false } = {}) {
  const enviados = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const cuerpo = JSON.parse(opts.body);
    if (ventanaCerrada && cuerpo.type === "text") {
      return new Response(JSON.stringify({ error: { code: 131047, message: "Re-engagement message" } }), { status: 400 });
    }
    enviados.push(cuerpo);
    return new Response(JSON.stringify({ messages: [{ id: "wamid.x" }] }), { status: 200 });
  };
  return { enviados, restaurar: () => (globalThis.fetch = original) };
}

test("si el dueño no escribió en 24 h, va la plantilla y el detalle queda pendiente", async () => {
  process.env.WHATSAPP_TOKEN = "t";
  const c = { ...oso, id: "avisos-1", whatsapp: { phone_number_id: "123" }, notificar_a: "5492230000001" };
  const wa = whatsappFalso();
  try {
    assert.equal(await avisarDueno(c, "🛒 Nuevo pedido\nAna\nTotal: $64.800", "nuevo pedido de Ana por $64.800"), "plantilla");
    assert.equal(wa.enviados[0].type, "template");
    assert.equal(wa.enviados[0].template.name, "aviso_dueno");
    assert.equal(wa.enviados[0].template.components[0].parameters[0].text, "nuevo pedido de Ana por $64.800");

    // El dueño responde: le llega el detalle y desde ahí los avisos van como texto.
    assert.equal(await mensajeDelDueno(c), 1);
    assert.equal(wa.enviados[1].type, "text");
    assert.match(wa.enviados[1].text.body, /Total: \$64\.800/);
    assert.equal(await avisarDueno(c, "otro aviso"), "texto");
    assert.equal(wa.enviados[2].type, "text");
  } finally {
    wa.restaurar();
  }
});

test("si Meta dice que la ventana se cerró, reintenta con la plantilla", async () => {
  process.env.WHATSAPP_TOKEN = "t";
  const c = { ...oso, id: "avisos-2", whatsapp: { phone_number_id: "123" }, notificar_a: "5492230000002" };
  let wa = whatsappFalso();
  await mensajeDelDueno(c); // ventana abierta según nuestros registros
  wa.restaurar();
  wa = whatsappFalso({ ventanaCerrada: true });
  try {
    assert.equal(await avisarDueno(c, "aviso", "resumen"), "plantilla");
    assert.equal(wa.enviados.at(-1).type, "template");
  } finally {
    wa.restaurar();
  }
});

test("el resumen de la plantilla cumple las reglas de Meta", () => {
  assert.equal(limpiarResumen("línea 1\nlínea 2\t  fin"), "línea 1 línea 2 fin");
  assert.equal(limpiarResumen("x".repeat(400)).length, 300);
  assert.equal(limpiarResumen(""), "hay un aviso nuevo");
});

const { puedeTranscribir, audioATexto } = await import("../src/audio.js");

test("los audios se transcriben solo en el plan que los incluye", () => {
  process.env.TRANSCRIPCION_API_KEY = "k";
  assert.equal(puedeTranscribir({ ...oso, plan: "temporada" }), true);
  assert.equal(puedeTranscribir({ ...oso, plan: "vendedor" }), false);
  assert.equal(puedeTranscribir({ ...oso, plan: "inicial" }), false);
  delete process.env.TRANSCRIPCION_API_KEY;
  assert.equal(puedeTranscribir({ ...oso, plan: "temporada" }), false);
});

test("descarga el audio de WhatsApp y lo pasa a texto", async () => {
  process.env.WHATSAPP_TOKEN = "t";
  process.env.TRANSCRIPCION_API_KEY = "k";
  const pedidos = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    pedidos.push(String(url));
    if (String(url).endsWith("/media123")) return Response.json({ url: "https://lookaside.fbsbx.com/audio", mime_type: "audio/ogg; codecs=opus", file_size: 1000 });
    if (String(url).includes("lookaside")) return new Response(new Uint8Array([1, 2, 3]));
    if (String(url).includes("transcriptions")) {
      assert.ok(opts.body instanceof FormData);
      assert.equal(opts.body.get("language"), "es");
      return Response.json({ text: "Hola, ¿tenés el ranchero?" });
    }
    return new Response("no", { status: 404 });
  };
  try {
    const texto = await audioATexto({ ...oso, plan: "temporada", whatsapp: { phone_number_id: "1" } }, "media123");
    assert.equal(texto, "(audio transcripto) Hola, ¿tenés el ranchero?");
    assert.equal(pedidos.length, 3);
  } finally {
    globalThis.fetch = original;
    delete process.env.TRANSCRIPCION_API_KEY;
  }
});

test("el webhook trae el id del audio", () => {
  const m = extraerMensajes({ entry: [{ changes: [{ value: { metadata: { phone_number_id: "1" }, messages: [{ from: "549", id: "w", type: "audio", audio: { id: "media123", voice: true } }] } }] }] });
  assert.equal(m[0].audioId, "media123");
});

test("ficha demo de inmobiliaria: precios en dólares y en texto", async () => {
  const inmo = clientes.get("demo-inmobiliaria");
  const prompt = armarPrompt(inmo);
  assert.match(prompt, /\[venta-2amb-guemes\] VENTA - 2 ambientes en Güemes: USD 89\.000/);
  assert.match(prompt, /\[alquiler-2amb-centro\] .*: \$620\.000 por mes/);
  const conv = obtenerConversacion("demo-inmobiliaria", "5495555555555");
  const r = await ejecutarHerramienta(
    "crear_pedido",
    { items: [{ producto_id: "alquiler-2amb-centro", cantidad: 1 }], nombre_cliente: "Ana", entrega_id: "visita", forma_pago: "otro" },
    { cliente: inmo, conv, notificar: async () => {} },
  );
  assert.equal(r.error, true);
  assert.match(r.contenido, /registrar_interesado/);
});

test("fichas demo de gimnasio y estética: pedidos con sus precios", () => {
  const gym = clientes.get("demo-gimnasio");
  const r1 = calcularPedido(gym, { items: [{ producto_id: "libre-mensual", cantidad: 1, adicionales: ["matricula"] }], entrega_id: "recepcion", forma_pago: "transferencia" });
  assert.equal(r1.total, 60000);
  const r2 = calcularPedido(gym, { items: [{ producto_id: "pase-quincenal", cantidad: 2 }], entrega_id: "recepcion", forma_pago: "transferencia" });
  assert.equal(r2.total, 70000);

  const est = clientes.get("demo-estetica");
  const r3 = calcularPedido(est, { items: [{ producto_id: "pack-axilas-cavado", cantidad: 1 }], entrega_id: "turno", forma_pago: "transferencia" });
  assert.equal(r3.total, 150000);
  assert.match(armarPrompt(est), /Láser soprano - axilas \(sesión\): \$14\.000/);
});

test("ficha demo de concesionaria: carga y muestra el stock en dólares", () => {
  const auto = clientes.get("demo-concesionaria");
  const prompt = armarPrompt(auto);
  assert.match(prompt, /\[corolla-2020\] Toyota Corolla 2\.0 XEI CVT 2020: USD 22\.000/);
  assert.match(prompt, /Financiamos hasta el 50%/);
});

test("ficha demo de delivery: envío por zona, adicionales y envío gratis", () => {
  const pz = clientes.get("demo-delivery");
  const r1 = calcularPedido(pz, {
    items: [{ producto_id: "muzza", cantidad: 1, adicionales: ["extra-muzza"] }, { producto_id: "gaseosa", cantidad: 1 }],
    entrega_id: "delivery-zona-2",
    forma_pago: "otro",
  });
  assert.equal(r1.subtotal, 23000);
  assert.equal(r1.total, 26500);
  const r2 = calcularPedido(pz, { items: [{ producto_id: "empanadas-docena", cantidad: 2 }, { producto_id: "especial", cantidad: 1 }], entrega_id: "delivery-zona-1", forma_pago: "transferencia" });
  assert.equal(r2.costoEntrega, 0);
  assert.equal(r2.total, 59000);
});
