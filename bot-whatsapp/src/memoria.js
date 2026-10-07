// Guarda las conversaciones, pedidos e interesados en archivos JSON dentro de data/.
// Alcanza para arrancar con varios clientes; si crece, se reemplaza por una base de datos
// cambiando solo este archivo.
import fs from "node:fs";
import path from "node:path";
import { DIR_DATOS, HORAS_SESION } from "./config.js";

const cache = new Map();

function archivoConversacion(clienteId, telefono) {
  return path.join(DIR_DATOS, clienteId, "conversaciones", `${telefono.replace(/\D/g, "")}.json`);
}

function escribir(archivo, contenido) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, contenido);
}

export function obtenerConversacion(clienteId, telefono) {
  const clave = `${clienteId}:${telefono}`;
  let conv = cache.get(clave);
  if (!conv) {
    const archivo = archivoConversacion(clienteId, telefono);
    conv = fs.existsSync(archivo)
      ? JSON.parse(fs.readFileSync(archivo, "utf8"))
      : { clienteId, telefono, mensajes: [], ultimo: 0, pausado_hasta: 0 };
    cache.set(clave, conv);
  }
  // Charla vieja: se archiva y se arranca de cero. El historial solo crece mientras
  // dura la sesión (nunca se edita), así la API puede reutilizarlo de caché.
  if (conv.mensajes.length && Date.now() - conv.ultimo > HORAS_SESION * 3600_000) {
    agregarLinea(clienteId, "historial.jsonl", { telefono, cerrada: new Date(conv.ultimo).toISOString(), mensajes: conv.mensajes });
    conv.mensajes = [];
  }
  return conv;
}

export function guardarConversacion(conv) {
  conv.ultimo = Date.now();
  escribir(archivoConversacion(conv.clienteId, conv.telefono), JSON.stringify(conv));
}

export function agregarLinea(clienteId, nombreArchivo, dato) {
  const archivo = path.join(DIR_DATOS, clienteId, nombreArchivo);
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.appendFileSync(archivo, JSON.stringify(dato) + "\n");
}

export function leerLineas(clienteId, nombreArchivo) {
  const archivo = path.join(DIR_DATOS, clienteId, nombreArchivo);
  if (!fs.existsSync(archivo)) return [];
  return fs.readFileSync(archivo, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

// Pausa el bot en una conversación para que la atienda una persona.
export function pausar(conv, horas) {
  conv.pausado_hasta = Date.now() + horas * 3600_000;
  guardarConversacion(conv);
}

export function reactivar(conv) {
  conv.pausado_hasta = 0;
  guardarConversacion(conv);
}

export function estaPausada(conv) {
  return conv.pausado_hasta > Date.now();
}
