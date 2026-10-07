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
  assert.ok(clientes.get("ejemplo-estetica"));
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
