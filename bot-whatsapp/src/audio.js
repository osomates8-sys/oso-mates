// Audios de WhatsApp: se descargan de Meta y se pasan a texto con un servicio de transcripción.
// Por defecto usa la API de transcripción de OpenAI (Whisper); cualquier servicio con el mismo
// formato sirve (por ejemplo Groq, más barato) cambiando TRANSCRIPCION_URL y TRANSCRIPCION_MODELO.
// Solo se usa en los planes que incluyen audios (planes.json -> "audios": true).
import { planDe } from "./uso.js";

const VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";
const URL_TRANSCRIPCION = process.env.TRANSCRIPCION_URL || "https://api.openai.com/v1/audio/transcriptions";
const MODELO_TRANSCRIPCION = process.env.TRANSCRIPCION_MODELO || "whisper-1";
const MAX_BYTES = 16 * 1024 * 1024; // límite de audios de WhatsApp

export function puedeTranscribir(cliente) {
  return Boolean(planDe(cliente)?.audios && process.env.TRANSCRIPCION_API_KEY);
}

async function descargarMedia(cliente, mediaId) {
  const token = process.env[cliente.whatsapp?.token_env || "WHATSAPP_TOKEN"];
  const auth = { Authorization: `Bearer ${token}` };
  const info = await fetch(`https://graph.facebook.com/${VERSION}/${mediaId}`, { headers: auth });
  if (!info.ok) throw new Error(`no se pudo ubicar el audio (${info.status})`);
  const { url, mime_type, file_size } = await info.json();
  if (file_size > MAX_BYTES) throw new Error("audio demasiado grande");
  const archivo = await fetch(url, { headers: auth });
  if (!archivo.ok) throw new Error(`no se pudo descargar el audio (${archivo.status})`);
  return { datos: Buffer.from(await archivo.arrayBuffer()), mime: mime_type || "audio/ogg" };
}

export async function transcribir(datos, mime = "audio/ogg") {
  const extension = mime.includes("mpeg") ? "mp3" : mime.includes("mp4") || mime.includes("aac") ? "m4a" : mime.includes("amr") ? "amr" : "ogg";
  const form = new FormData();
  form.append("file", new Blob([datos], { type: mime.split(";")[0] }), `audio.${extension}`);
  form.append("model", MODELO_TRANSCRIPCION);
  form.append("language", "es");
  const res = await fetch(URL_TRANSCRIPCION, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.TRANSCRIPCION_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`transcripción falló (${res.status}): ${await res.text()}`);
  return String((await res.json()).text || "").trim();
}

// Devuelve el texto que va a leer el vendedor, o null si no se pudo transcribir.
export async function audioATexto(cliente, mediaId) {
  try {
    const { datos, mime } = await descargarMedia(cliente, mediaId);
    const texto = await transcribir(datos, mime);
    return texto ? `(audio transcripto) ${texto}` : null;
  } catch (e) {
    console.warn(`[${cliente.id}] audio sin transcribir: ${e.message}`);
    return null;
  }
}
