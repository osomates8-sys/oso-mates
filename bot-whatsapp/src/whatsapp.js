// Conexión con la API oficial de WhatsApp Business (Meta Cloud API).
import crypto from "node:crypto";

const VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";
const LIMITE_TEXTO = 4000; // WhatsApp corta en 4096 caracteres

function tokenDe(cliente) {
  return process.env[cliente.whatsapp?.token_env || "WHATSAPP_TOKEN"];
}

async function llamar(cliente, cuerpo) {
  const token = tokenDe(cliente);
  if (!token) throw new Error(`${cliente.id}: falta el token de WhatsApp (${cliente.whatsapp?.token_env || "WHATSAPP_TOKEN"})`);
  const res = await fetch(`https://graph.facebook.com/${VERSION}/${cliente.whatsapp.phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...cuerpo }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
  return res.json();
}

export function partirTexto(texto) {
  const partes = [];
  let resto = texto;
  while (resto.length > LIMITE_TEXTO) {
    let corte = resto.lastIndexOf("\n", LIMITE_TEXTO);
    if (corte < LIMITE_TEXTO / 2) corte = LIMITE_TEXTO;
    partes.push(resto.slice(0, corte));
    resto = resto.slice(corte).trimStart();
  }
  if (resto) partes.push(resto);
  return partes;
}

export async function enviarTexto(cliente, para, texto) {
  for (const parte of partirTexto(texto)) {
    await llamar(cliente, { to: para, type: "text", text: { body: parte, preview_url: true } });
  }
}

// Marca el mensaje como leído (los dos tildes azules) y muestra "escribiendo...".
export async function marcarLeido(cliente, messageId) {
  await llamar(cliente, { status: "read", message_id: messageId, typing_indicator: { type: "text" } }).catch((e) =>
    console.warn(`[whatsapp] no se pudo marcar como leído: ${e.message}`),
  );
}

// Meta firma cada aviso con el App Secret: así sabemos que el mensaje viene de WhatsApp.
export function firmaValida(cuerpoCrudo, firma, appSecret) {
  if (!appSecret) return process.env.PERMITIR_SIN_FIRMA === "1"; // solo para pruebas locales
  if (!firma?.startsWith("sha256=")) return false;
  const esperada = crypto.createHmac("sha256", appSecret).update(cuerpoCrudo).digest("hex");
  const a = Buffer.from(firma.slice(7), "hex");
  const b = Buffer.from(esperada, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Extrae los mensajes entrantes del aviso de Meta.
export function extraerMensajes(aviso) {
  const salida = [];
  for (const entrada of aviso?.entry || []) {
    for (const cambio of entrada.changes || []) {
      const v = cambio.value || {};
      const phoneNumberId = v.metadata?.phone_number_id;
      for (const m of v.messages || []) {
        let texto = null;
        if (m.type === "text") texto = m.text?.body;
        else if (m.type === "button") texto = m.button?.text;
        else if (m.type === "interactive") texto = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title;
        else if ((m.type === "image" || m.type === "video" || m.type === "document") && m[m.type]?.caption) {
          texto = `(mandó un archivo con el texto: "${m[m.type].caption}")`;
        } else {
          texto = `(mandó un mensaje de tipo ${m.type} que no se puede leer)`;
        }
        salida.push({ phoneNumberId, de: m.from, id: m.id, texto, nombre: v.contacts?.[0]?.profile?.name });
      }
    }
  }
  return salida;
}
