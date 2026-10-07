// Servidor que recibe los mensajes de WhatsApp (webhook de Meta) y contesta con el vendedor.
// Un solo servidor atiende a todos los negocios cargados en clientes/.
import http from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { cargarClientes, clientePorNumero, MODELO } from "./config.js";
import { responder } from "./agente.js";
import { obtenerConversacion, estaPausada, pausar, reactivar } from "./memoria.js";
import { enviarTexto, marcarLeido, firmaValida, extraerMensajes } from "./whatsapp.js";
import { encolar } from "./cola.js";

const PUERTO = Number(process.env.PORT || 3000);
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

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
  marcarLeido(cliente, msg.id);

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
    await enviarTexto(cliente, msg.de, respuesta);
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

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/salud") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, clientes: [...clientes.keys()], modelo: MODELO }));
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
    console.log(`  · ${c.nombre} (${c.id}) ${c.whatsapp?.phone_number_id ? `-> número ${c.whatsapp.phone_number_id}` : "-> sin número de WhatsApp todavía"}`);
  }
  if (!VERIFY_TOKEN) console.warn("Falta WHATSAPP_VERIFY_TOKEN: Meta no va a poder verificar el webhook.");
  if (!APP_SECRET) console.warn("Falta WHATSAPP_APP_SECRET: se rechazan todos los mensajes (para pruebas locales, PERMITIR_SIN_FIRMA=1).");
});
