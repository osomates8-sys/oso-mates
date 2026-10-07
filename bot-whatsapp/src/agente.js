// El vendedor: recibe el mensaje del cliente, consulta a Claude con la ficha del negocio
// y ejecuta las acciones (pedido, interesado, derivación) hasta tener la respuesta final.
import Anthropic from "@anthropic-ai/sdk";
import { MODELO, ESFUERZO } from "./config.js";
import { armarPrompt } from "./prompt.js";
import { HERRAMIENTAS, ejecutarHerramienta } from "./herramientas.js";
import { guardarConversacion } from "./memoria.js";

const anthropic = new Anthropic();
const MAX_VUELTAS = 6;
const prompts = new Map();

function promptDe(cliente) {
  if (!prompts.has(cliente.id)) prompts.set(cliente.id, armarPrompt(cliente));
  return prompts.get(cliente.id);
}

export function limpiarCachePrompts() {
  prompts.clear();
}

function encabezadoFecha(fecha = new Date()) {
  const f = fecha.toLocaleString("es-AR", {
    timeZone: process.env.ZONA_HORARIA || "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `[${f}]`;
}

// Devuelve el texto a mandarle al cliente.
export async function responder({ cliente, conv, texto, notificar }) {
  const mensajes = conv.mensajes;
  mensajes.push({ role: "user", content: `${encabezadoFecha()} ${texto}` });

  const ctx = { cliente, conv, notificar };
  const textos = [];

  try {
    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const r = await anthropic.beta.messages.create({
        model: MODELO,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        // Si el modelo rechaza un mensaje por sus filtros de seguridad,
        // la API reintenta sola con el modelo de respaldo recomendado.
        fallbacks: "default",
        output_config: { effort: ESFUERZO },
        cache_control: { type: "ephemeral" },
        system: promptDe(cliente),
        tools: HERRAMIENTAS,
        messages: mensajes,
      });

      if (r.stop_reason === "refusal") {
        const aviso = "Perdón, con eso no te puedo ayudar por acá. ¿Querés que te contacte una persona del equipo?";
        mensajes.push({ role: "assistant", content: aviso });
        return aviso;
      }

      mensajes.push({ role: "assistant", content: r.content });
      for (const b of r.content) if (b.type === "text" && b.text.trim()) textos.push(b.text.trim());

      if (r.stop_reason !== "tool_use") break;

      const usos = r.content.filter((b) => b.type === "tool_use");
      const resultados = await Promise.all(
        usos.map(async (u) => {
          const { contenido, error } = await ejecutarHerramienta(u.name, u.input, ctx);
          console.log(`[${cliente.id}] ${u.name} -> ${error ? "ERROR " : ""}${contenido.split("\n")[0]}`);
          return { type: "tool_result", tool_use_id: u.id, content: contenido, ...(error && { is_error: true }) };
        }),
      );
      mensajes.push({ role: "user", content: resultados });
    }
  } finally {
    guardarConversacion(conv);
  }

  return textos.join("\n\n") || "¿Me contás un poco más así te ayudo mejor?";
}
