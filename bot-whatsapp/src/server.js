// Servidor que recibe los mensajes de WhatsApp (webhook de Meta) y contesta con el vendedor.
// Un solo servidor atiende a todos los negocios cargados en clientes/.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { cargarClientes, clientePorNumero, numerosDe, MODELO, DIR_DATOS } from "./config.js";
import { responder } from "./agente.js";
import { obtenerConversacion, estaPausada, pausar, reactivar, leerLineas } from "./memoria.js";
import { enviarTexto, marcarLeido, firmaValida, extraerMensajes } from "./whatsapp.js";
import { encolar } from "./cola.js";
import { registrarConversacion, resumenUso, planDe, mesDe, PLANES } from "./uso.js";
import { generarInforme, mesAnterior } from "./informe.js";
import { precio } from "./prompt.js";

const PUERTO = Number(process.env.PORT || 3000);
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;
const ADMIN_CLAVE = process.env.ADMIN_CLAVE;

const clientes = cargarClientes();
const yaVistos = new Set(); // Meta a veces reenvía el mismo mensaje

function soloDigitos(s) {
  return String(s || "").replace(/\D/g, "");
}

function notificadorDe(cliente) {
  return async (texto) => {
    console.log(`[${cliente.id}] aviso al dueño: ${texto.split("\n")[0]}`);
    if (!cliente.notificar_a) return;
    await enviarTexto(cliente, cliente.notificar_a, texto).catch((e) =>
      console.warn(`[${cliente.id}] no se pudo avisar al dueño: ${e.message}`),
    );
  };
}

// El dueño controla el bot desde su WhatsApp:
//   #bot 5492231234567    -> el bot vuelve a atender esa charla
//   #pausa 5492231234567  -> el bot deja de atender esa charla (atiende una persona)
async function comandoDelDueno(cliente, texto) {
  const m = /^#(bot|pausa)\s+\+?([\d\s-]+)/i.exec(texto.trim());
  if (!m) return false;
  const tel = soloDigitos(m[2]);
  const conv = obtenerConversacion(cliente.id, tel);
  if (m[1].toLowerCase() === "bot") reactivar(conv);
  else pausar(conv, 24 * 365);
  await enviarTexto(cliente, cliente.notificar_a, `Listo: el bot ${m[1].toLowerCase() === "bot" ? "volvió a atender" : "quedó pausado en"} la charla con ${tel}.`);
  return true;
}

async function atender(msg) {
  const cliente = clientePorNumero(clientes, msg.phoneNumberId);
  if (!cliente) {
    console.warn(`Mensaje para un número sin negocio configurado: ${msg.phoneNumberId}`);
    return;
  }
  marcarLeido(cliente, msg.id, msg.phoneNumberId);

  if (cliente.notificar_a && soloDigitos(msg.de) === soloDigitos(cliente.notificar_a)) {
    if (await comandoDelDueno(cliente, msg.texto)) return;
  }

  const clave = `${cliente.id}:${msg.de}`;
  encolar(clave, msg.texto, async (texto) => {
    const conv = obtenerConversacion(cliente.id, msg.de);
    if (estaPausada(conv)) {
      console.log(`[${cliente.id}] ${msg.de}: charla en pausa, la atiende una persona`);
      return;
    }
    await registrarConversacion(cliente, conv, notificadorDe(cliente));
    let respuesta;
    try {
      respuesta = await responder({ cliente, conv, texto, notificar: notificadorDe(cliente) });
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError) {
        console.error(`[${cliente.id}] Claude no disponible:`, e.message);
      } else if (e instanceof Anthropic.APIError) {
        console.error(`[${cliente.id}] error de Claude ${e.status}:`, e.message);
      } else {
        console.error(`[${cliente.id}] error:`, e);
      }
      respuesta = "Perdón, tuve un problema para responderte. ¿Me lo repetís en un ratito? 🙏";
    }
    await enviarTexto(cliente, msg.de, respuesta, msg.phoneNumberId);
  });
}

function leerCuerpo(req) {
  return new Promise((ok, mal) => {
    const partes = [];
    let total = 0;
    req.on("data", (p) => {
      total += p.length;
      if (total > 1_000_000) {
        mal(new Error("cuerpo demasiado grande"));
        req.destroy();
      } else partes.push(p);
    });
    req.on("end", () => ok(Buffer.concat(partes)));
    req.on("error", mal);
  });
}

// --- Panel para vos (el proveedor): uso de cada negocio y lo que hay que cobrar ---

function claveValida(dada) {
  if (!ADMIN_CLAVE || !dada) return false;
  const a = crypto.createHash("sha256").update(String(dada)).digest();
  const b = crypto.createHash("sha256").update(ADMIN_CLAVE).digest();
  return crypto.timingSafeEqual(a, b);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function panelHtml(mes) {
  const filas = [...clientes.values()].map((c) => {
    const u = resumenUso(c, mes);
    const pedidos = leerLineas(c.id, "pedidos.jsonl").filter((p) => mesDe(new Date(p.fecha)) === mes);
    const vendido = pedidos.reduce((s, p) => s + (p.total || 0), 0);
    const pct = u.limite ? Math.round((u.conversaciones / u.limite) * 100) : 0;
    return `<tr><td>${esc(c.nombre)}<small>${esc(c.id)}</small></td><td>${esc(u.plan)}</td>
      <td class="n">${u.conversaciones}${u.limite != null ? ` / ${u.limite}` : ""}<small>${pct}%</small></td>
      <td class="n">${u.extras}</td><td class="n">${precio(u.abono)}</td><td class="n">${precio(u.montoExtras)}</td>
      <td class="n"><b>${precio(u.abono + u.montoExtras)}</b></td><td class="n">${pedidos.length}<small>${precio(vendido)}</small></td></tr>`;
  });
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Panel de negocios</title>
<style>body{font:15px system-ui,sans-serif;margin:24px;color:#10232a;background:#f2f5f4}table{border-collapse:collapse;width:100%;background:#fff}
th,td{padding:10px 12px;border-bottom:1px solid #d3dddb;text-align:left;vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#4e6168}
.n{text-align:right;font-variant-numeric:tabular-nums}small{display:block;color:#4e6168;font-size:12px}.wrap{overflow-x:auto}</style>
<h1>Negocios — ${esc(mes)}</h1>
<p>Conversación extra: ${precio(PLANES.precio_conversacion_extra)}. Cambiá de mes con <code>?mes=AAAA-MM</code>.</p>
<div class="wrap"><table><tr><th>Negocio</th><th>Plan</th><th class="n">Conversaciones</th><th class="n">Extras</th><th class="n">Abono</th><th class="n">Extras $</th><th class="n">A cobrar</th><th class="n">Pedidos del bot</th></tr>
${filas.join("")}</table></div>`;
}

async function rutaAdmin(url, res) {
  if (!claveValida(url.searchParams.get("clave"))) {
    res.writeHead(404);
    return res.end();
  }
  const mes = /^\d{4}-\d{2}$/.test(url.searchParams.get("mes") || "") ? url.searchParams.get("mes") : mesDe();
  if (url.pathname === "/admin") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(panelHtml(mes));
  }
  if (url.pathname === "/admin/informe") {
    const cliente = clientes.get(url.searchParams.get("cliente"));
    if (!cliente) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Falta ?cliente=<id> o no existe.");
    }
    const archivo = path.join(DIR_DATOS, cliente.id, "informes", `${mes}.txt`);
    let texto;
    if (url.searchParams.get("generar") === "1" || !fs.existsSync(archivo)) texto = (await generarInforme(cliente, mes)).texto;
    else texto = fs.readFileSync(archivo, "utf8");
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end(texto);
  }
  res.writeHead(404);
  res.end();
}

// Informe mensual automático para los planes que lo incluyen: el día 1 (o apenas arranca
// el servidor) se arma el del mes anterior y se le manda al dueño por WhatsApp.
async function informesAutomaticos() {
  const mes = mesAnterior();
  for (const c of clientes.values()) {
    if (!planDe(c)?.informe) continue;
    const hubo = fs.existsSync(path.join(DIR_DATOS, c.id, "mensajes", `${mes}.jsonl`));
    const yaEsta = fs.existsSync(path.join(DIR_DATOS, c.id, "informes", `${mes}.txt`));
    if (!hubo || yaEsta) continue;
    try {
      const { texto } = await generarInforme(c, mes);
      console.log(`[${c.id}] informe de ${mes} generado`);
      if (c.notificar_a) await enviarTexto(c, c.notificar_a, texto);
    } catch (e) {
      console.error(`[${c.id}] no se pudo generar el informe de ${mes}:`, e.message);
    }
  }
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/salud") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, clientes: [...clientes.keys()], modelo: MODELO }));
  }

  if (req.method === "GET" && url.pathname.startsWith("/admin")) {
    return rutaAdmin(url, res).catch((e) => {
      console.error("[admin]", e);
      res.writeHead(500);
      res.end("error");
    });
  }

  // Meta verifica el webhook una sola vez, al configurarlo.
  if (req.method === "GET" && url.pathname === "/webhook") {
    const ok = url.searchParams.get("hub.mode") === "subscribe" && VERIFY_TOKEN && url.searchParams.get("hub.verify_token") === VERIFY_TOKEN;
    res.writeHead(ok ? 200 : 403);
    return res.end(ok ? url.searchParams.get("hub.challenge") : "token inválido");
  }

  if (req.method === "POST" && url.pathname === "/webhook") {
    let crudo;
    try {
      crudo = await leerCuerpo(req);
    } catch {
      res.writeHead(413);
      return res.end();
    }
    if (!firmaValida(crudo, req.headers["x-hub-signature-256"], APP_SECRET)) {
      res.writeHead(401);
      return res.end("firma inválida");
    }
    // Contestamos rápido a Meta y procesamos después (si tardamos, reintenta).
    res.writeHead(200);
    res.end("ok");

    let aviso;
    try {
      aviso = JSON.parse(crudo.toString("utf8"));
    } catch {
      return;
    }
    for (const msg of extraerMensajes(aviso)) {
      if (yaVistos.has(msg.id)) continue;
      yaVistos.add(msg.id);
      if (yaVistos.size > 5000) yaVistos.delete(yaVistos.values().next().value);
      atender(msg).catch((e) => console.error("[atender]", e));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

servidor.listen(PUERTO, () => {
  console.log(`Bot de WhatsApp escuchando en el puerto ${PUERTO} — modelo ${MODELO}`);
  for (const c of clientes.values()) {
    const nums = numerosDe(c);
    const plan = planDe(c);
    console.log(`  · ${c.nombre} (${c.id}) plan ${plan?.nombre || "SIN PLAN"} ${nums.length ? `-> ${nums.join(", ")}` : "-> sin número de WhatsApp todavía"}`);
    if (!plan) console.warn(`    ${c.id}: falta "plan" en la ficha (${Object.keys(PLANES.planes).join(", ")}); no se cuentan límites.`);
    else if (nums.length > plan.numeros) console.warn(`    ${c.id}: tiene ${nums.length} números y su plan incluye ${plan.numeros}.`);
  }
  if (!ADMIN_CLAVE) console.warn("Sin ADMIN_CLAVE: el panel /admin está desactivado.");
  if (process.env.INFORMES_AUTOMATICOS !== "0") {
    informesAutomaticos();
    setInterval(informesAutomaticos, 3600_000).unref();
  }
  if (!VERIFY_TOKEN) console.warn("Falta WHATSAPP_VERIFY_TOKEN: Meta no va a poder verificar el webhook.");
  if (!APP_SECRET) console.warn("Falta WHATSAPP_APP_SECRET: se rechazan todos los mensajes (para pruebas locales, PERMITIR_SIN_FIRMA=1).");
});
