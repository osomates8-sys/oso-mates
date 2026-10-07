// Número de demostración: un solo número de WhatsApp que atiende con la ficha que le asignes
// a cada comerciante, para que pruebe su propio bot desde su celular.
// Se maneja desde tu WhatsApp (ADMIN_WHATSAPP) escribiéndole al número de demo:
//   #demo estetica-sofi 5492231234567   -> ese número prueba el bot de esa ficha
//   #demo estetica-sofi                  -> lo probás vos
//   #demos                               -> demos activas
//   #fin 5492231234567                   -> termina esa demo
import fs from "node:fs";
import path from "node:path";
import { DIR_DATOS } from "./config.js";

export const DEMO = {
  numero: process.env.DEMO_PHONE_NUMBER_ID || "",
  tokenEnv: process.env.DEMO_TOKEN_ENV || "WHATSAPP_TOKEN",
  admin: (process.env.ADMIN_WHATSAPP || "").replace(/\D/g, ""),
  dias: Number(process.env.DEMO_DIAS || 7),
  porDefecto: process.env.DEMO_FICHA_POR_DEFECTO || "",
};

const DIA_MS = 24 * 3600_000;
const soloDigitos = (s) => String(s || "").replace(/\D/g, "");

function archivo() {
  return path.join(DIR_DATOS, "_demo", "asignaciones.json");
}

function leer() {
  return fs.existsSync(archivo()) ? JSON.parse(fs.readFileSync(archivo(), "utf8")) : {};
}

function guardar(asignaciones) {
  fs.mkdirSync(path.dirname(archivo()), { recursive: true });
  fs.writeFileSync(archivo(), JSON.stringify(asignaciones, null, 2));
}

export function esNumeroDemo(phoneNumberId) {
  return Boolean(DEMO.numero) && phoneNumberId === DEMO.numero;
}

export function esAdmin(telefono) {
  return Boolean(DEMO.admin) && soloDigitos(telefono) === DEMO.admin;
}

// Qué ficha tiene que usar el número de demo para este teléfono (o null).
export function fichaAsignada(telefono, ahora = Date.now()) {
  const a = leer()[soloDigitos(telefono)];
  if (a && a.hasta > ahora) return a.ficha;
  return DEMO.porDefecto || null;
}

// La ficha de la demo como si fuera un negocio aparte: sus datos no se mezclan con los reales,
// no cuenta para ningún plan y muestra todas las funciones (incluidos los audios).
export function clienteDemo(ficha) {
  return {
    ...ficha,
    id: `_demo/${ficha.id}`,
    plan: "temporada",
    whatsapp: { phone_number_id: DEMO.numero, token_env: DEMO.tokenEnv },
    notificar_a: "",
    integraciones: undefined, // la demo nunca escribe en la planilla o agenda real del negocio
  };
}

const fecha = (ms) =>
  new Date(ms).toLocaleDateString("es-AR", { timeZone: process.env.ZONA_HORARIA || "America/Argentina/Buenos_Aires", day: "numeric", month: "long" });

const AYUDA =
  "Comandos de demo:\n" +
  "#demo <ficha> <teléfono> — ese número prueba el bot de esa ficha\n" +
  "#demo <ficha> — lo probás vos\n" +
  "#demos — demos activas\n" +
  "#fin <teléfono> — termina una demo";

// Procesa un comando tuyo. Devuelve el texto de respuesta.
export function comandoDemo(texto, clientes, ahora = Date.now()) {
  const partes = texto.trim().split(/\s+/);
  const cmd = partes[0].toLowerCase();
  const asignaciones = leer();

  if (cmd === "#demos") {
    const activas = Object.entries(asignaciones).filter(([, a]) => a.hasta > ahora);
    if (!activas.length) return `No hay demos activas.\n\n${AYUDA}`;
    return "Demos activas:\n" + activas.map(([tel, a]) => `- ${tel}: ${a.ficha} (hasta el ${fecha(a.hasta)})`).join("\n");
  }

  if (cmd === "#fin") {
    const tel = soloDigitos(partes.slice(1).join(""));
    if (!tel || !asignaciones[tel]) return `No encontré una demo para "${partes.slice(1).join(" ")}".`;
    delete asignaciones[tel];
    guardar(asignaciones);
    return `Listo, terminó la demo de ${tel}.`;
  }

  if (cmd === "#demo") {
    const id = partes[1];
    if (!id) return AYUDA;
    const ficha = clientes.get(id);
    if (!ficha) return `No existe la ficha "${id}". Fichas disponibles: ${[...clientes.keys()].join(", ")}`;
    const tel = soloDigitos(partes.slice(2).join("")) || DEMO.admin;
    const hasta = ahora + DEMO.dias * DIA_MS;
    asignaciones[tel] = { ficha: id, desde: ahora, hasta };
    guardar(asignaciones);
    const quien = tel === DEMO.admin ? "Vos probás" : `El ${tel} prueba`;
    return (
      `Listo: ${quien} el bot de *${ficha.nombre}* hasta el ${fecha(hasta)}.\n` +
      (tel === DEMO.admin
        ? "Escribile a este número como si fueras un cliente."
        : "Pedile que le escriba \"hola\" a este número. Si usás el número de prueba de Meta, primero agregá su teléfono como destinatario de prueba.") +
      `\nPara terminarla: #fin ${tel}`
    );
  }

  return AYUDA;
}
