// Acciones que el vendedor puede ejecutar. Los precios y totales se calculan acá,
// con el catálogo del negocio: el modelo nunca define cuánto se cobra.
import crypto from "node:crypto";
import { agregarLinea, pausar } from "./memoria.js";
import { linkMercadoPago } from "./pagos.js";
import { precio } from "./prompt.js";

export const HERRAMIENTAS = [
  {
    name: "crear_pedido",
    description:
      "Registra un pedido confirmado por el cliente y devuelve el total y cómo pagar (link de Mercado Pago o datos de transferencia). Usala solo después de que el cliente confirmó qué quiere, su nombre, la entrega y la forma de pago.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "Productos del pedido.",
          items: {
            type: "object",
            properties: {
              producto_id: { type: "string", description: "id del catálogo (el que va entre corchetes)." },
              cantidad: { type: "integer", minimum: 1 },
              adicionales: { type: "array", items: { type: "string" }, description: "ids de adicionales para este producto." },
              detalle: { type: "string", description: "Detalle del cliente para este producto, por ejemplo el texto del grabado." },
            },
            required: ["producto_id", "cantidad"],
            additionalProperties: false,
          },
        },
        nombre_cliente: { type: "string" },
        entrega_id: { type: "string", description: "id de la opción de entrega." },
        direccion: { type: "string", description: "Dirección o ciudad y código postal, si la entrega es un envío." },
        forma_pago: { type: "string", enum: ["transferencia", "mercadopago", "otro"] },
        notas: { type: "string" },
      },
      required: ["items", "nombre_cliente", "entrega_id", "forma_pago"],
      additionalProperties: false,
    },
  },
  {
    name: "registrar_interesado",
    description:
      "Guarda a una persona interesada para que el equipo la contacte: pide un turno, una visita, una cotización o que la llamen. Usala cuando hay interés concreto pero la venta no se cierra en el chat.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        interes: { type: "string", description: "Qué quiere (producto, servicio, turno)." },
        preferencia: { type: "string", description: "Días, horarios o forma de contacto que prefiere." },
        notas: { type: "string" },
      },
      required: ["interes"],
      additionalProperties: false,
    },
  },
  {
    name: "derivar_a_humano",
    description:
      "Pasa la conversación a una persona del equipo y pausa las respuestas automáticas. Usala ante reclamos, problemas con un pedido, pedidos explícitos de hablar con alguien o preguntas que no podés responder con la información disponible.",
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string" },
        resumen: { type: "string", description: "Resumen breve de la charla para que la persona retome sin preguntar todo de nuevo." },
      },
      required: ["motivo", "resumen"],
      additionalProperties: false,
    },
  },
];

class ErrorHerramienta extends Error {}

export function calcularPedido(cliente, input) {
  const m = cliente.moneda;
  if (!Array.isArray(input.items) || input.items.length === 0) throw new ErrorHerramienta("El pedido no tiene productos.");
  const transferencia = input.forma_pago === "transferencia";

  const lineas = [];
  for (const it of input.items) {
    const prod = cliente.catalogo.find((p) => p.id === it.producto_id);
    if (!prod) throw new ErrorHerramienta(`No existe el producto "${it.producto_id}". Usá un id del catálogo.`);
    if (prod.disponible === false) throw new ErrorHerramienta(`${prod.nombre} está sin stock.`);
    const cantidad = Number.isInteger(it.cantidad) && it.cantidad > 0 ? it.cantidad : null;
    if (!cantidad) throw new ErrorHerramienta(`Cantidad inválida para ${prod.nombre}.`);

    const base = transferencia && prod.precio_transferencia != null ? prod.precio_transferencia : prod.precio;
    lineas.push({ id: prod.id, nombre: prod.nombre, cantidad, precio_unitario: base, detalle: it.detalle || "" });

    for (const aid of it.adicionales || []) {
      const ad = cliente.adicionales.find((a) => a.id === aid);
      if (!ad) throw new ErrorHerramienta(`No existe el adicional "${aid}".`);
      lineas.push({ id: ad.id, nombre: `${ad.nombre} (${prod.nombre})`, cantidad, precio_unitario: ad.precio, detalle: "" });
    }
  }
  const subtotal = lineas.reduce((s, l) => s + l.precio_unitario * l.cantidad, 0);

  const entrega = cliente.entrega.opciones.find((e) => e.id === input.entrega_id);
  if (!entrega) throw new ErrorHerramienta(`No existe la opción de entrega "${input.entrega_id}".`);
  let costoEntrega = entrega.costo;
  const gratisDesde = cliente.entrega.envio_gratis_desde;
  if (gratisDesde != null && subtotal >= gratisDesde) costoEntrega = 0;

  const total = subtotal + (costoEntrega || 0);
  const resumen = [
    ...lineas.map((l) => `${l.cantidad} x ${l.nombre}${l.detalle ? ` ("${l.detalle}")` : ""}: ${precio(l.precio_unitario * l.cantidad, m)}`),
    `Entrega: ${entrega.nombre} — ${costoEntrega === 0 ? "sin costo" : costoEntrega == null ? "costo a confirmar" : precio(costoEntrega, m)}`,
    `Total: ${precio(total, m)}${costoEntrega == null ? " + envío a confirmar" : ""}`,
  ].join("\n");

  return { lineas, subtotal, entrega, costoEntrega, total, resumen };
}

async function crearPedido(input, { cliente, conv, notificar }) {
  const calc = calcularPedido(cliente, input);
  const pedido = {
    id: `P-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    fecha: new Date().toISOString(),
    telefono: conv.telefono,
    nombre_cliente: input.nombre_cliente,
    direccion: input.direccion || "",
    forma_pago: input.forma_pago,
    notas: input.notas || "",
    estado: "pendiente_de_pago",
    ...calc,
    entrega: calc.entrega.nombre,
  };

  let comoPagar;
  if (input.forma_pago === "mercadopago") {
    const link = await linkMercadoPago(cliente, pedido).catch((e) => {
      console.error("[mercadopago]", e);
      return null;
    });
    pedido.link_pago = link;
    comoPagar = link
      ? `Link de pago de Mercado Pago: ${link}`
      : "No se pudo generar el link de pago. Decile que una persona del equipo le manda el link en breve.";
  } else if (input.forma_pago === "transferencia") {
    const t = cliente.pagos.transferencia || {};
    comoPagar = t.alias
      ? `Transferir ${precio(calc.total, cliente.moneda)} al alias ${t.alias}${t.titular ? ` (a nombre de ${t.titular})` : ""} y mandar el comprobante por este chat.`
      : "El equipo le pasa los datos bancarios por este chat en el horario de atención. Después tiene que mandar el comprobante.";
  } else {
    comoPagar = cliente.pagos.otros || "El equipo coordina el pago por este chat.";
  }

  agregarLinea(cliente.id, "pedidos.jsonl", pedido);
  await notificar(
    `🛒 Nuevo pedido ${pedido.id}\n${input.nombre_cliente} (wa.me/${conv.telefono})\n${calc.resumen}\nPago: ${input.forma_pago}` +
      (input.direccion ? `\nDirección: ${input.direccion}` : "") +
      (input.notas ? `\nNotas: ${input.notas}` : ""),
    `nuevo pedido de ${input.nombre_cliente} por ${precio(calc.total, cliente.moneda)}`,
  );

  return `Pedido ${pedido.id} registrado.\n${calc.resumen}\nCómo pagar: ${comoPagar}`;
}

async function registrarInteresado(input, { cliente, conv, notificar }) {
  agregarLinea(cliente.id, "interesados.jsonl", { fecha: new Date().toISOString(), telefono: conv.telefono, ...input });
  await notificar(
    `⭐ Nuevo interesado: ${input.nombre || "sin nombre"} (wa.me/${conv.telefono})\nQuiere: ${input.interes}` +
      (input.preferencia ? `\nPrefiere: ${input.preferencia}` : "") +
      (input.notas ? `\nNotas: ${input.notas}` : ""),
    `${input.nombre || "una persona"} quiere ${input.interes}`,
  );
  return "Interesado registrado. El equipo lo va a contactar; avisale y confirmale lo que pidió.";
}

async function derivarAHumano(input, { cliente, conv, notificar }) {
  pausar(conv, Number(process.env.HORAS_PAUSA_HUMANO || 12));
  agregarLinea(cliente.id, "derivaciones.jsonl", { fecha: new Date().toISOString(), telefono: conv.telefono, ...input });
  await notificar(
    `🙋 Te necesitan en wa.me/${conv.telefono}\nMotivo: ${input.motivo}\nResumen: ${input.resumen}\n` +
      `El bot quedó pausado en esa charla. Para reactivarlo mandá: #bot ${conv.telefono}`,
    `un cliente necesita que lo atiendas (${input.motivo})`,
  );
  return `Listo, se avisó al equipo y el bot queda en pausa en esta charla. Decile que una persona le escribe en el horario de atención (${cliente.horario_atencion || "lo antes posible"}).`;
}

const EJECUTORES = {
  crear_pedido: crearPedido,
  registrar_interesado: registrarInteresado,
  derivar_a_humano: derivarAHumano,
};

// Devuelve { contenido, error } para armar el tool_result.
export async function ejecutarHerramienta(nombre, input, ctx) {
  const fn = EJECUTORES[nombre];
  if (!fn) return { contenido: `Herramienta desconocida: ${nombre}`, error: true };
  try {
    return { contenido: await fn(input || {}, ctx), error: false };
  } catch (e) {
    if (e instanceof ErrorHerramienta) return { contenido: e.message, error: true };
    console.error(`[herramienta ${nombre}]`, e);
    return { contenido: "Error interno al ejecutar la acción. Ofrecé derivar a una persona.", error: true };
  }
}
