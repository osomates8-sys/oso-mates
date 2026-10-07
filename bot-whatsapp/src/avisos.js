// Avisos al dueño del negocio (pedidos, interesados, derivaciones, uso del plan, informe).
// WhatsApp solo deja mandar texto libre a quien escribió en las últimas 24 h. Si el dueño no
// escribió, se le manda la plantilla aprobada por Meta con un resumen de una línea y el detalle
// completo queda guardado: le llega apenas responda cualquier cosa.
import fs from "node:fs";
import path from "node:path";
import { DIR_DATOS } from "./config.js";
import { enviarTexto, enviarPlantilla, FUERA_DE_VENTANA } from "./whatsapp.js";

export const PLANTILLA = {
  nombre: process.env.PLANTILLA_AVISO || "aviso_dueno",
  idioma: process.env.PLANTILLA_IDIOMA || "es_AR",
  // Texto que se registra en Meta (scripts: npm run plantilla). {{1}} es el resumen del aviso.
  texto: "Hola, tenés una novedad en el WhatsApp de tu negocio: {{1}}. Tocá Ver detalle o respondé este mensaje para recibir el detalle completo.",
  boton: "Ver detalle",
  ejemplo: "nuevo pedido de Ana por $64.800",
};
const VENTANA_MS = 23 * 3600_000; // un margen antes de las 24 h de Meta
const MAX_PENDIENTES = 20;

function archivo(clienteId) {
  return path.join(DIR_DATOS, clienteId, "dueno.json");
}

function leer(clienteId) {
  const a = archivo(clienteId);
  return fs.existsSync(a) ? JSON.parse(fs.readFileSync(a, "utf8")) : { ultimo_mensaje: 0, pendientes: [] };
}

function guardar(clienteId, estado) {
  fs.mkdirSync(path.dirname(archivo(clienteId)), { recursive: true });
  fs.writeFileSync(archivo(clienteId), JSON.stringify(estado));
}

// Meta no acepta saltos de línea, tabulaciones ni muchos espacios seguidos en las variables.
export function limpiarResumen(texto) {
  const t = String(texto || "").replace(/[\n\r\t]+/g, " ").replace(/ {2,}/g, " ").trim();
  return t.length > 300 ? `${t.slice(0, 297)}...` : t || "hay un aviso nuevo";
}

export function ventanaAbierta(clienteId, ahora = Date.now()) {
  return ahora - leer(clienteId).ultimo_mensaje < VENTANA_MS;
}

// Se llama cuando el dueño le escribe al número del negocio: abre la ventana y le manda lo pendiente.
export async function mensajeDelDueno(cliente, ahora = Date.now()) {
  const estado = leer(cliente.id);
  estado.ultimo_mensaje = ahora;
  const pendientes = estado.pendientes.splice(0);
  guardar(cliente.id, estado);
  for (const texto of pendientes) {
    await enviarTexto(cliente, cliente.notificar_a, texto).catch((e) => console.warn(`[${cliente.id}] aviso pendiente no enviado: ${e.message}`));
  }
  return pendientes.length;
}

function encolar(cliente, texto) {
  const estado = leer(cliente.id);
  estado.pendientes.push(texto);
  if (estado.pendientes.length > MAX_PENDIENTES) estado.pendientes.splice(0, estado.pendientes.length - MAX_PENDIENTES);
  guardar(cliente.id, estado);
}

async function porPlantilla(cliente, texto, resumen) {
  encolar(cliente, texto);
  await enviarPlantilla(cliente, cliente.notificar_a, PLANTILLA.nombre, PLANTILLA.idioma, [limpiarResumen(resumen)]);
  return "plantilla";
}

// Devuelve cómo salió: "texto", "plantilla" o null si no se pudo avisar.
export async function avisarDueno(cliente, texto, resumen) {
  if (!cliente.notificar_a) return null;
  resumen ||= texto.split("\n")[0];
  try {
    if (ventanaAbierta(cliente.id)) {
      try {
        await enviarTexto(cliente, cliente.notificar_a, texto);
        return "texto";
      } catch (e) {
        if (e.codigo !== FUERA_DE_VENTANA) throw e;
      }
    }
    return await porPlantilla(cliente, texto, resumen);
  } catch (e) {
    console.warn(`[${cliente.id}] no se pudo avisar al dueño: ${e.message}`);
    return null;
  }
}
