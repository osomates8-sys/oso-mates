// Genera links de pago de Mercado Pago (Checkout Pro).
// Cada negocio usa su propio access token, guardado en la variable de entorno
// que indica clientes/<id>.json -> pagos.mercadopago.access_token_env.

export async function linkMercadoPago(cliente, pedido) {
  const envVar = cliente.pagos.mercadopago?.access_token_env;
  const token = envVar ? process.env[envVar] : null;
  if (!token) return null;

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: pedido.lineas.map((l) => ({
        id: l.id,
        title: l.nombre,
        quantity: l.cantidad,
        unit_price: l.precio_unitario,
        currency_id: cliente.moneda,
      })),
      external_reference: pedido.id,
      statement_descriptor: cliente.nombre.slice(0, 22),
    }),
  });
  if (!res.ok) {
    console.error(`[mercadopago] ${cliente.id}: error ${res.status} ${await res.text()}`);
    return null;
  }
  const data = await res.json();
  return data.init_point || null;
}
