// Chat de prueba en la terminal: hablás con el bot como si fueras un cliente por WhatsApp.
// Sirve para probar la ficha de un negocio y para hacer demos sin conectar WhatsApp.
//   npm run chat -- oso-mates
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

// Las pruebas no se mezclan con los datos reales (ni cuentan para el plan del negocio).
process.env.DIR_DATOS = process.env.DIR_DATOS_SIMULADOR || "data-simulador";
const { cargarClientes } = await import("./config.js");
const { responder } = await import("./agente.js");
const { obtenerConversacion, estaPausada, reactivar } = await import("./memoria.js");

const clientes = cargarClientes();
const id = process.argv[2] || [...clientes.keys()][0];
const cliente = clientes.get(id);
if (!cliente) {
  console.error(`No existe el negocio "${id}". Disponibles: ${[...clientes.keys()].join(", ")}`);
  process.exit(1);
}

const TELEFONO = "5490000000000"; // cliente de prueba
const conv = obtenerConversacion(cliente.id, TELEFONO);
conv.mensajes = [];
reactivar(conv);

console.log(`\nChateando con el bot de ${cliente.nombre}. Escribí como un cliente.`);
console.log("Comandos: /nuevo (empezar de cero), /salir\n");

const rl = readline.createInterface({ input: stdin, output: stdout });
const notificar = async (texto) => console.log(`\n\x1b[33m📲 Aviso al dueño:\n${texto}\x1b[0m\n`);

while (true) {
  const texto = (await rl.question("\x1b[36mVos:\x1b[0m ")).trim();
  if (!texto) continue;
  if (texto === "/salir") break;
  if (texto === "/nuevo") {
    conv.mensajes = [];
    reactivar(conv);
    console.log("(conversación nueva)\n");
    continue;
  }
  if (estaPausada(conv)) {
    console.log("(el bot está en pausa: lo atendería una persona. /nuevo para reiniciar)\n");
    continue;
  }
  try {
    const inicio = Date.now();
    const respuesta = await responder({ cliente, conv, texto, notificar });
    console.log(`\x1b[32m${cliente.nombre_asistente || "Bot"}:\x1b[0m ${respuesta}  \x1b[2m(${((Date.now() - inicio) / 1000).toFixed(1)} s)\x1b[0m\n`);
  } catch (e) {
    console.error("Error:", e.message, "\n");
  }
}
rl.close();
