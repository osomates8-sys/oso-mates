// Informe mensual de un negocio: uso del plan, ventas, interesados, derivaciones
// y un análisis de las charlas del mes (qué preguntan, qué se vende, qué se pierde).
//   npm run informe -- oso-mates            (mes anterior)
//   npm run informe -- oso-mates 2026-10    (un mes puntual)
//   npm run informe -- oso-mates 2026-10 --enviar   (además lo manda al WhatsApp del dueño)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { DIR_DATOS, MODELO, cargarClientes } from "./config.js";
import { leerLineas } from "./memoria.js";
import { precio } from "./prompt.js";
import { mesDe, resumenUso } from "./uso.js";

const MAX_CARACTERES_ANALISIS = 300_000;

export function mesAnterior(fecha = new Date()) {
  const [a, m] = mesDe(fecha).split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

const delMes = (mes) => (x) => mesDe(new Date(x.fecha)) === mes;

export function estadisticas(cliente, mes) {
  const pedidos = leerLineas(cliente.id, "pedidos.jsonl").filter(delMes(mes));
  const interesados = leerLineas(cliente.id, "interesados.jsonl").filter(delMes(mes));
  const derivaciones = leerLineas(cliente.id, "derivaciones.jsonl").filter(delMes(mes));
  const mensajes = leerLineas(cliente.id, `mensajes/${mes}.jsonl`);

  const productos = new Map();
  for (const p of pedidos) {
    for (const l of p.lineas || []) productos.set(l.nombre, (productos.get(l.nombre) || 0) + l.cantidad);
  }
  const masPedidos = [...productos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    uso: resumenUso(cliente, mes),
    pedidos: pedidos.length,
    montoPedidos: pedidos.reduce((s, p) => s + (p.total || 0), 0),
    masPedidos,
    interesados: interesados.length,
    derivaciones,
    clientesUnicos: new Set(mensajes.map((m) => m.telefono)).size,
    mensajes,
  };
}

// Le pide a Claude que lea las charlas del mes y saque conclusiones para el dueño.
async function analizar(cliente, mes, est) {
  const porCliente = new Map();
  for (const m of est.mensajes) {
    if (!porCliente.has(m.telefono)) porCliente.set(m.telefono, []);
    porCliente.get(m.telefono).push(`Cliente: ${m.cliente}\nBot: ${m.bot}`);
  }
  let charlas = [...porCliente.values()].map((c, i) => `--- Charla ${i + 1} ---\n${c.join("\n")}`).join("\n\n");
  if (charlas.length > MAX_CARACTERES_ANALISIS) charlas = charlas.slice(-MAX_CARACTERES_ANALISIS);

  const anthropic = new Anthropic();
  const r = await anthropic.beta.messages.create({
    model: MODELO,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system:
      "Analizás las charlas de WhatsApp que un vendedor automático tuvo con clientes de un negocio y escribís un resumen para el dueño. " +
      "Escribí en español rioplatense, claro y concreto, en formato WhatsApp: *negrita* con asteriscos simples, listas con guiones, sin tablas ni títulos con #. Máximo 30 renglones. " +
      "No inventes datos: basate solo en las charlas. No incluyas números de teléfono.",
    messages: [
      {
        role: "user",
        content:
          `Negocio: ${cliente.nombre} (${cliente.rubro || ""}). Mes: ${mes}.\n\n` +
          "Armá estas cuatro secciones:\n" +
          "1. *Lo que más preguntan* (los 5 temas más repetidos).\n" +
          "2. *Qué se vendió y qué no*: productos que más interesan y por qué se cayeron ventas (precio, envío, falta de información, etc.).\n" +
          "3. *Lo que el bot no supo responder*: preguntas que habría que agregar a la ficha del negocio.\n" +
          "4. *3 sugerencias concretas* para vender más el mes que viene.\n\n" +
          `Charlas del mes:\n\n${charlas}`,
      },
    ],
  });
  if (r.stop_reason === "refusal") return "(No se pudo generar el análisis de las charlas este mes.)";
  return r.content
    .filter((b) => b.type === "text")
    .map((b) => b.text.trim())
    .join("\n\n");
}

export async function generarInforme(cliente, mes = mesAnterior(), { analizarCharlas = true } = {}) {
  const est = estadisticas(cliente, mes);
  const m = cliente.moneda || "ARS";
  const u = est.uso;
  const lineas = [
    `*Informe de ${cliente.nombre} — ${mes}*`,
    "",
    `*Uso del plan ${u.plan}*`,
    `- Conversaciones: ${u.conversaciones}${u.limite != null ? ` de ${u.limite}` : ""}`,
    ...(u.extras ? [`- Conversaciones extra: ${u.extras} (${precio(u.montoExtras, m)})`] : []),
    ...(u.audios ? [`- Audios que el bot escuchó y respondió: ${u.audios}`] : []),
    `- Clientes distintos que escribieron: ${est.clientesUnicos}`,
    "",
    "*Resultados*",
    `- Pedidos cerrados por el bot: ${est.pedidos} (${precio(est.montoPedidos, m)})`,
    `- Interesados para seguimiento: ${est.interesados}`,
    `- Charlas derivadas a una persona: ${est.derivaciones.length}`,
  ];
  if (est.masPedidos.length) {
    lineas.push("", "*Lo más pedido*", ...est.masPedidos.map(([nombre, cant]) => `- ${nombre}: ${cant}`));
  }
  if (analizarCharlas && est.mensajes.length) {
    lineas.push("", await analizar(cliente, mes, est));
  }
  const texto = lineas.join("\n");

  const archivo = path.join(DIR_DATOS, cliente.id, "informes", `${mes}.txt`);
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, texto);
  return { texto, archivo };
}

// Uso desde la terminal
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [id, ...resto] = process.argv.slice(2);
  const clientes = cargarClientes();
  const cliente = clientes.get(id);
  if (!cliente) {
    console.error(`Uso: npm run informe -- <negocio> [AAAA-MM] [--enviar]\nNegocios: ${[...clientes.keys()].join(", ")}`);
    process.exit(1);
  }
  const mes = resto.find((x) => /^\d{4}-\d{2}$/.test(x)) || mesAnterior();
  const { texto, archivo } = await generarInforme(cliente, mes);
  console.log(`${texto}\n\n(guardado en ${archivo})`);
  if (resto.includes("--enviar")) {
    if (!cliente.notificar_a) throw new Error("El negocio no tiene notificar_a configurado.");
    const { avisarDueno } = await import("./avisos.js");
    const via = await avisarDueno(cliente, texto, `ya está tu informe de ${mes}`);
    console.log(via ? `Enviado a ${cliente.notificar_a} (${via === "plantilla" ? "plantilla; el detalle le llega cuando responda" : "texto"}).` : "No se pudo enviar.");
  }
}
