// En WhatsApp la gente manda varios mensajes seguidos ("hola" / "tenés mates?" / "de madera").
// Esta cola junta los mensajes que llegan casi juntos y los responde de una sola vez,
// y nunca procesa dos tandas de la misma conversación al mismo tiempo.

const ESPERA_MS = Number(process.env.ESPERA_MS ?? 3000);
const conversaciones = new Map();

export function encolar(clave, texto, procesar) {
  let c = conversaciones.get(clave);
  if (!c) {
    c = { pendientes: [], ocupada: false, timer: null };
    conversaciones.set(clave, c);
  }
  c.pendientes.push(texto);
  if (c.ocupada) return; // se toma al terminar la tanda actual
  clearTimeout(c.timer);
  c.timer = setTimeout(() => vaciar(clave, c, procesar), ESPERA_MS);
}

async function vaciar(clave, c, procesar) {
  c.timer = null;
  if (!c.pendientes.length) return;
  c.ocupada = true;
  const textos = c.pendientes.splice(0);
  try {
    await procesar(textos.join("\n"));
  } catch (e) {
    console.error(`[cola ${clave}]`, e);
  } finally {
    c.ocupada = false;
    if (c.pendientes.length) c.timer = setTimeout(() => vaciar(clave, c, procesar), ESPERA_MS);
    else conversaciones.delete(clave);
  }
}
