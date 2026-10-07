// Manda cada pedido, interesado y derivación a otra herramienta (por ejemplo un webhook de n8n),
// para llevarlos a una planilla de Google, a la agenda o al sistema que use el negocio.
// Se activa por negocio en su ficha:
//   "integraciones": { "webhook_url": "https://...", "clave_env": "N8N_CLAVE_OSO", "eventos": ["pedido", "interesado", "derivacion"] }
// Si no hay webhook_url no hace nada. Si el webhook falla, el bot sigue atendiendo igual.

const TIMEOUT_MS = 8000;
const EVENTOS = ["pedido", "interesado", "derivacion"];

export function integracionActiva(cliente, evento) {
  const i = cliente.integraciones;
  if (!i?.webhook_url) return false;
  return (i.eventos || EVENTOS).includes(evento);
}

async function postear(url, cuerpo, headers) {
  const res = await fetch(url, { method: "POST", headers, body: cuerpo, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`respondió ${res.status}`);
}

// Devuelve true si se entregó. Nunca tira error.
export async function enviarEvento(cliente, evento, datos) {
  if (!integracionActiva(cliente, evento)) return false;
  const i = cliente.integraciones;
  const cuerpo = JSON.stringify({ evento, negocio: { id: cliente.id, nombre: cliente.nombre }, fecha: new Date().toISOString(), datos });
  const headers = { "Content-Type": "application/json" };
  // Clave opcional: en n8n se valida con una credencial "Header Auth" (nombre X-Mostrador-Clave).
  const clave = i.clave_env ? process.env[i.clave_env] : null;
  if (clave) headers["X-Mostrador-Clave"] = clave;
  for (let intento = 1; intento <= 2; intento++) {
    try {
      await postear(i.webhook_url, cuerpo, headers);
      return true;
    } catch (e) {
      if (intento === 2) console.warn(`[${cliente.id}] integración (${evento}) no entregada: ${e.message}`);
    }
  }
  return false;
}
