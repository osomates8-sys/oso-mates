// Prueba de punta a punta del número de demo: el servidor real, con WhatsApp y Claude simulados.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bot-demo-"));
Object.assign(process.env, {
  DIR_DATOS: DIR,
  PORT: "3456",
  ESPERA_MS: "0",
  INFORMES_AUTOMATICOS: "0",
  WHATSAPP_APP_SECRET: "secreto",
  WHATSAPP_TOKEN: "t",
  DEMO_PHONE_NUMBER_ID: "NUMERO_DEMO",
  ADMIN_WHATSAPP: "5492230009999",
  ANTHROPIC_API_KEY: "x",
  ANTHROPIC_BASE_URL: "http://claude-falso.test",
});

const enviados = [];
const pedidosAClaude = [];
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url instanceof Request ? url.url : url);
  if (u.includes("graph.facebook.com")) {
    const cuerpo = JSON.parse(opts.body);
    if (cuerpo.type === "text") enviados.push({ desde: u.split("/")[4], para: cuerpo.to, texto: cuerpo.text.body });
    return Response.json({ messages: [{ id: "wamid.x" }] });
  }
  if (u.includes("claude-falso.test")) {
    const body = JSON.parse(url instanceof Request ? await url.text() : opts.body);
    pedidosAClaude.push(body);
    const primera = body.messages.length === 1;
    const content = primera
      ? [{ type: "tool_use", id: "tu1", name: "registrar_interesado", input: { nombre: "Ana", interes: "turno de láser" } }]
      : [{ type: "text", text: "¡Listo Ana! Te anoté para el turno." }];
    return Response.json({ id: "m", type: "message", role: "assistant", model: "x", stop_reason: primera ? "tool_use" : "end_turn", stop_details: null, usage: { input_tokens: 1, output_tokens: 1 }, content });
  }
  return fetchOriginal(url, opts);
};

const { servidor } = await import("../src/server.js");
after(() => {
  servidor.close();
  globalThis.fetch = fetchOriginal;
});

async function webhook(de, texto) {
  const cuerpo = JSON.stringify({
    entry: [{ changes: [{ value: { metadata: { phone_number_id: "NUMERO_DEMO" }, messages: [{ from: de, id: crypto.randomUUID(), type: "text", text: { body: texto } }] } }] }],
  });
  const firma = "sha256=" + crypto.createHmac("sha256", "secreto").update(cuerpo).digest("hex");
  const r = await fetchOriginal("http://127.0.0.1:3456/webhook", { method: "POST", body: cuerpo, headers: { "x-hub-signature-256": firma } });
  assert.equal(r.status, 200);
}

async function esperar(condicion) {
  for (let i = 0; i < 100 && !condicion(); i++) await new Promise((r) => setTimeout(r, 20));
  assert.ok(condicion(), "no llegó el mensaje esperado");
}

test("alguien sin demo asignada recibe la presentación", async () => {
  await webhook("5491100000001", "hola");
  await esperar(() => enviados.some((m) => m.para === "5491100000001"));
  assert.match(enviados.at(-1).texto, /número de demostración/);
  assert.equal(pedidosAClaude.length, 0);
});

test("#demo asigna una ficha y el comerciante chatea con su bot", async () => {
  await webhook("5492230009999", "#demo demo-estetica 5492231234567");
  await esperar(() => enviados.some((m) => m.para === "5492230009999" && /Estética Demo/.test(m.texto)));

  await webhook("5492231234567", "hola, quiero un turno de láser");
  await esperar(() => enviados.filter((m) => m.para === "5492231234567").length >= 2);
  const recibidos = enviados.filter((m) => m.para === "5492231234567");
  assert.equal(recibidos[0].texto, "¡Listo Ana! Te anoté para el turno.");
  assert.match(recibidos[1].texto, /Así te llegaría este aviso a vos, como dueño/);
  assert.match(recibidos[1].texto, /quiere|Quiere: turno de láser/);
  assert.ok(recibidos.every((m) => m.desde === "NUMERO_DEMO"));
  assert.match(pedidosAClaude[0].system, /Estética Demo/);
});

test("#demos lista y #fin termina la demo", async () => {
  await webhook("5492230009999", "#demos");
  await esperar(() => enviados.some((m) => /Demos activas/.test(m.texto)));
  assert.match(enviados.at(-1).texto, /5492231234567: demo-estetica/);

  await webhook("5492230009999", "#fin 5492231234567");
  await esperar(() => enviados.some((m) => /terminó la demo/.test(m.texto)));

  const antes = pedidosAClaude.length;
  await webhook("5492231234567", "hola de nuevo");
  await esperar(() => enviados.filter((m) => m.para === "5492231234567" && /número de demostración/.test(m.texto)).length === 1);
  assert.equal(pedidosAClaude.length, antes);
});

test("una ficha inexistente da un error claro y solo el admin puede usar comandos", async () => {
  await webhook("5492230009999", "#demo no-existe");
  await esperar(() => enviados.some((m) => /No existe la ficha "no-existe"/.test(m.texto)));
  await webhook("5491100000002", "#demo demo-estetica");
  await esperar(() => enviados.some((m) => m.para === "5491100000002"));
  assert.match(enviados.filter((m) => m.para === "5491100000002").at(-1).texto, /número de demostración/);
});
