// Edge Function: sincroniza stores.plan con la suscripción de RevenueCat.
//
// La llaman dos actores:
//  1. RevenueCat (webhook) en cada compra, renovación, vencimiento, etc.
//     Se autentica con el header Authorization que configurás en el panel.
//  2. La app, justo después de comprar o restaurar, con el JWT del usuario,
//     para que el plan quede activo al instante sin esperar al webhook.
//
// En ambos casos no confiamos en el contenido del evento: le preguntamos a la
// API de RevenueCat el estado actual del usuario (lo que RevenueCat recomienda).
//
// Deploy: supabase functions deploy revenuecat --no-verify-jwt
// Secrets: supabase secrets set REVENUECAT_SECRET_API_KEY=sk_... REVENUECAT_WEBHOOK_AUTH=...

import { createClient } from 'npm:@supabase/supabase-js@2';

const ENTITLEMENT = 'pro';
const RC_SECRET = Deno.env.get('REVENUECAT_SECRET_API_KEY') ?? '';
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Compara en tiempo constante para no filtrar el secreto por timing.
function safeEqual(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hasActiveEntitlement(appUserId: string): Promise<boolean> {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${RC_SECRET}` },
  });
  if (!res.ok) throw new Error(`RevenueCat respondió ${res.status}`);

  const { subscriber } = await res.json();
  const ent = subscriber?.entitlements?.[ENTITLEMENT];
  if (!ent) return false;
  // expires_date null = compra de por vida.
  return ent.expires_date === null || new Date(ent.expires_date).getTime() > Date.now();
}

// El app_user_id de RevenueCat es el id del usuario de Supabase (ver Purchases.logIn en la app).
async function syncUser(appUserId: string) {
  if (!UUID.test(appUserId)) return null; // usuarios anónimos de RevenueCat: nada que hacer
  const plan = (await hasActiveEntitlement(appUserId)) ? 'pro' : 'free';
  const { error } = await admin.from('stores').update({ plan }).eq('owner_id', appUserId);
  if (error) throw error;
  return plan;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  if (!RC_SECRET) return json({ error: 'Falta REVENUECAT_SECRET_API_KEY' }, 500);

  const auth = req.headers.get('Authorization') ?? '';

  try {
    // 1) Webhook de RevenueCat
    if (WEBHOOK_AUTH && safeEqual(auth, WEBHOOK_AUTH)) {
      const { event } = await req.json();
      const ids: string[] =
        event?.type === 'TRANSFER'
          ? [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])]
          : [event?.app_user_id].filter(Boolean);

      const results = await Promise.all(ids.map(syncUser));
      return json({ ok: true, synced: ids.length, results });
    }

    // 2) La app pidiendo sincronizar al usuario logueado
    const token = auth.replace(/^Bearer\s+/i, '');
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: 'No autorizado' }, 401);

    const plan = await syncUser(data.user.id);
    return json({ ok: true, plan });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
