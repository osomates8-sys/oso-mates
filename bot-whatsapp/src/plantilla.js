// Registra en Meta la plantilla de avisos al dueño, o consulta si ya está aprobada.
//   npm run plantilla -- oso-mates            (la crea en la cuenta de WhatsApp Business del negocio)
//   npm run plantilla -- oso-mates --estado   (muestra si está aprobada, pendiente o rechazada)
// Necesita whatsapp.waba_id en la ficha (WhatsApp Manager -> Configuración de la cuenta -> ID de la cuenta).
import { cargarClientes } from "./config.js";
import { PLANTILLA } from "./avisos.js";

const VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";
const [id, opcion] = process.argv.slice(2);
const clientes = cargarClientes();
const cliente = clientes.get(id);
if (!cliente) {
  console.error(`Uso: npm run plantilla -- <negocio> [--estado]\nNegocios: ${[...clientes.keys()].join(", ")}`);
  process.exit(1);
}
const waba = cliente.whatsapp?.waba_id;
const token = process.env[cliente.whatsapp?.token_env || "WHATSAPP_TOKEN"];
if (!waba || !token) {
  console.error(`${cliente.id}: falta whatsapp.waba_id en la ficha o el token de WhatsApp en .env.`);
  process.exit(1);
}
const base = `https://graph.facebook.com/${VERSION}/${waba}/message_templates`;
const auth = { Authorization: `Bearer ${token}` };

if (opcion === "--estado") {
  const res = await fetch(`${base}?name=${encodeURIComponent(PLANTILLA.nombre)}&fields=name,language,status,category,rejected_reason`, { headers: auth });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  if (!data.data?.length) console.log(`La plantilla "${PLANTILLA.nombre}" no existe todavía. Creala con: npm run plantilla -- ${cliente.id}`);
  for (const p of data.data || []) console.log(`${p.name} (${p.language}, ${p.category}): ${p.status}${p.rejected_reason && p.rejected_reason !== "NONE" ? ` — motivo: ${p.rejected_reason}` : ""}`);
} else {
  const res = await fetch(base, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: PLANTILLA.nombre,
      language: PLANTILLA.idioma,
      category: "UTILITY",
      components: [
        { type: "BODY", text: PLANTILLA.texto, example: { body_text: [[PLANTILLA.ejemplo]] } },
        { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: PLANTILLA.boton }] },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Meta rechazó la creación: ${data.error?.error_user_msg || data.error?.message || JSON.stringify(data)}`);
    process.exit(1);
  }
  console.log(`Plantilla "${PLANTILLA.nombre}" enviada a revisión (estado: ${data.status}). Meta suele aprobarla en minutos.`);
  console.log(`Consultá el estado con: npm run plantilla -- ${cliente.id} --estado`);
}
