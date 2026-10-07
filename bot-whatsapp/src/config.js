// Carga los negocios (clientes) desde clientes/*.json.
// Cada archivo es un negocio distinto: así un mismo servidor atiende a varios clientes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DIR_CLIENTES = path.join(raiz, "clientes");
export const DIR_DATOS = process.env.DIR_DATOS || path.join(raiz, "data");

export const MODELO = process.env.CLAUDE_MODEL || "claude-opus-5-5";
export const ESFUERZO = process.env.CLAUDE_EFFORT || "medium";
// Horas sin mensajes después de las que la charla arranca de cero.
export const HORAS_SESION = Number(process.env.HORAS_SESION || 12);

function validar(c, archivo) {
  const faltan = ["id", "nombre", "catalogo"].filter((k) => c[k] == null);
  if (faltan.length) throw new Error(`${archivo}: faltan los campos ${faltan.join(", ")}`);
  const ids = new Set();
  for (const p of c.catalogo) {
    // precio_texto sirve para precios que no son un número simple ("$650.000 por mes + expensas", "a consultar")
    if (!p.id || !p.nombre || (typeof p.precio !== "number" && !p.precio_texto)) {
      throw new Error(`${archivo}: cada producto necesita id, nombre y precio numérico (o precio_texto)`);
    }
    if (ids.has(p.id)) throw new Error(`${archivo}: id de producto repetido "${p.id}"`);
    ids.add(p.id);
  }
}

export function cargarClientes(dir = DIR_CLIENTES) {
  const clientes = new Map();
  for (const archivo of fs.readdirSync(dir)) {
    if (!archivo.endsWith(".json") || archivo.startsWith("_")) continue;
    const c = JSON.parse(fs.readFileSync(path.join(dir, archivo), "utf8"));
    validar(c, archivo);
    c.adicionales ||= [];
    c.preguntas_frecuentes ||= [];
    c.promociones ||= [];
    c.reglas ||= [];
    c.entrega ||= { opciones: [] };
    c.pagos ||= {};
    c.moneda ||= "ARS";
    clientes.set(c.id, c);
  }
  return clientes;
}

// Un negocio puede tener uno o varios números (sucursales): phone_number_id acepta un texto o una lista.
export function numerosDe(cliente) {
  const n = cliente.whatsapp?.phone_number_id;
  return (Array.isArray(n) ? n : [n]).filter(Boolean);
}

// Busca qué negocio es dueño del número de WhatsApp que recibió el mensaje.
export function clientePorNumero(clientes, phoneNumberId) {
  for (const c of clientes.values()) {
    if (numerosDe(c).includes(phoneNumberId)) return c;
  }
  return null;
}
