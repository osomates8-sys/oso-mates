// Cuenta las conversaciones de cada negocio para cobrar según su plan.
// Una conversación son todos los mensajes con un mismo cliente dentro de 24 horas.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DIR_DATOS } from "./config.js";
import { precio } from "./prompt.js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PLANES = JSON.parse(fs.readFileSync(path.join(raiz, "planes.json"), "utf8"));
const VENTANA_MS = 24 * 3600_000;
const AVISOS = [0.8, 1]; // se avisa al dueño al llegar al 80% y al 100% del plan

export function planDe(cliente) {
  return PLANES.planes[cliente.plan] || null;
}

// "2026-10" según la hora de Argentina
export function mesDe(fecha = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.ZONA_HORARIA || "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(fecha);
  return `${p.find((x) => x.type === "year").value}-${p.find((x) => x.type === "month").value}`;
}

function archivoUso(clienteId, mes) {
  return path.join(DIR_DATOS, clienteId, "uso", `${mes}.json`);
}

export function leerUso(clienteId, mes = mesDe()) {
  const archivo = archivoUso(clienteId, mes);
  return fs.existsSync(archivo) ? JSON.parse(fs.readFileSync(archivo, "utf8")) : { conversaciones: 0, avisos: [] };
}

function guardarUso(clienteId, mes, uso) {
  const archivo = archivoUso(clienteId, mes);
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, JSON.stringify(uso));
}

export function resumenUso(cliente, mes = mesDe()) {
  const plan = planDe(cliente);
  const { conversaciones } = leerUso(cliente.id, mes);
  const limite = plan?.conversaciones ?? null;
  const extras = limite == null ? 0 : Math.max(0, conversaciones - limite);
  return {
    mes,
    plan: plan?.nombre || "sin plan",
    abono: plan?.precio ?? 0,
    limite,
    conversaciones,
    extras,
    montoExtras: extras * PLANES.precio_conversacion_extra,
  };
}

// Se llama con cada mensaje que atiende el bot. Si pasaron 24 h desde que empezó
// la última conversación con ese cliente, cuenta una nueva. Devuelve true si contó.
export async function registrarConversacion(cliente, conv, notificar, ahora = Date.now()) {
  if (conv.ventana_desde && ahora - conv.ventana_desde < VENTANA_MS) return false;
  conv.ventana_desde = ahora;

  const mes = mesDe(new Date(ahora));
  const uso = leerUso(cliente.id, mes);
  uso.conversaciones += 1;
  const plan = planDe(cliente);
  let aviso = null;
  if (plan) {
    for (const umbral of AVISOS) {
      const clave = String(umbral);
      if (uso.conversaciones >= Math.ceil(plan.conversaciones * umbral) && !uso.avisos.includes(clave)) {
        uso.avisos.push(clave);
        aviso = umbral;
      }
    }
  }
  guardarUso(cliente.id, mes, uso);

  if (aviso != null) {
    const base = `📊 Llevás ${uso.conversaciones} de ${plan.conversaciones} conversaciones de tu plan ${plan.nombre} este mes.`;
    await notificar(
      aviso < 1
        ? `${base} Si seguís a este ritmo, consultá si te conviene el plan siguiente.`
        : `${base} El bot sigue atendiendo: cada conversación extra se cobra ${precio(PLANES.precio_conversacion_extra, PLANES.moneda)}.`,
      `usaste ${uso.conversaciones} de ${plan.conversaciones} conversaciones de tu plan este mes`,
    );
  }
  return true;
}
