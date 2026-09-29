-- Esquema de base de datos para Vendé (Supabase / Postgres).
-- Pegalo en Supabase → SQL Editor y ejecutalo una vez.
-- Ya está aplicado en el proyecto "vende" (dilxpuyfdbyswcjzeioe).

-- ─── Tiendas ────────────────────────────────────────────────────────────────
-- Una tienda por usuario. Se crea sola al registrarse (ver trigger abajo).
create table public.stores (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users (id) on delete cascade,
  name        text not null default 'Mi tienda',
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  whatsapp    text,
  -- 'free' | 'pro'. Lo actualiza el webhook de RevenueCat (ver PLAN.md).
  plan        text not null default 'free' check (plan in ('free', 'pro')),
  created_at  timestamptz not null default now()
);

-- ─── Productos ──────────────────────────────────────────────────────────────
create table public.products (
  id                   uuid primary key default gen_random_uuid(),
  store_id             uuid not null references public.stores (id) on delete cascade,
  name                 text not null,
  description          text,
  price                numeric(12, 2) not null default 0 check (price >= 0),
  cost                 numeric(12, 2) check (cost >= 0),
  stock                integer not null default 0,
  low_stock_threshold  integer not null default 3,
  image_url            text,
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);
create index products_store_idx on public.products (store_id);

-- ─── Pedidos ────────────────────────────────────────────────────────────────
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores (id) on delete cascade,
  customer_name   text not null,
  customer_phone  text,
  status          text not null default 'pendiente'
                  check (status in ('pendiente', 'pagado', 'entregado', 'cancelado')),
  total           numeric(12, 2) not null default 0,
  notes           text,
  -- 'app': lo cargó el vendedor. 'web': lo hizo un cliente desde el catálogo.
  source          text not null default 'app' check (source in ('app', 'web')),
  created_at      timestamptz not null default now()
);
create index orders_store_created_idx on public.orders (store_id, created_at desc);

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  -- Copia del nombre y precio al momento de la venta.
  product_name  text not null,
  unit_price    numeric(12, 2) not null,
  quantity      integer not null check (quantity > 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- ─── Seguridad (RLS): cada usuario sólo ve lo suyo ──────────────────────────
alter table public.stores      enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

create or replace function public.my_store_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.stores where owner_id = auth.uid()
$$;

create policy "dueño lee su tienda" on public.stores
  for select using (owner_id = auth.uid());
create policy "dueño edita su tienda" on public.stores
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- El plan no se puede cambiar desde la app: sólo nombre, slug y whatsapp.
revoke update on public.stores from authenticated, anon;
grant update (name, slug, whatsapp) on public.stores to authenticated;

create policy "dueño gestiona productos" on public.products
  for all using (store_id = public.my_store_id())
  with check (store_id = public.my_store_id());

create policy "dueño gestiona pedidos" on public.orders
  for all using (store_id = public.my_store_id())
  with check (store_id = public.my_store_id());

create policy "dueño gestiona ítems" on public.order_items
  for all using (order_id in (select id from public.orders where store_id = public.my_store_id()))
  with check (order_id in (select id from public.orders where store_id = public.my_store_id()));

-- Catálogo público para el link de la tienda: sólo datos que el cliente puede ver
-- (sin costos ni stock exacto). Devuelve null si la tienda no existe.
-- Uso: select public_catalog('mi-tienda');
create or replace function public.public_catalog(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', s.name,
    'whatsapp', s.whatsapp,
    'branding', s.plan = 'free',
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'description', p.description,
        'price', p.price, 'image_url', p.image_url, 'in_stock', p.stock > 0
      ) order by p.name)
      from public.products p where p.store_id = s.id and p.active
    ), '[]'::jsonb)
  )
  from public.stores s where s.slug = p_slug
$$;
grant execute on function public.public_catalog(text) to anon, authenticated;

-- ─── Límites del plan gratis (validados en el servidor) ────────────────────
-- Mantener en sincronía con FREE_LIMITS en src/lib/types.ts.
create or replace function public.enforce_free_limits() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
begin
  select plan into v_plan from public.stores where id = new.store_id;
  if v_plan = 'pro' then
    return new;
  end if;

  if tg_table_name = 'products'
     and (select count(*) from public.products where store_id = new.store_id) >= 15 then
    raise exception 'LIMIT_PRODUCTS' using hint = 'El plan gratis permite hasta 15 productos';
  end if;

  if tg_table_name = 'orders'
     and (select count(*) from public.orders
          where store_id = new.store_id and created_at >= date_trunc('month', now())) >= 30 then
    raise exception 'LIMIT_ORDERS' using hint = 'El plan gratis permite hasta 30 pedidos por mes';
  end if;

  return new;
end;
$$;

create trigger products_free_limit before insert on public.products
  for each row execute function public.enforce_free_limits();
create trigger orders_free_limit before insert on public.orders
  for each row execute function public.enforce_free_limits();

-- ─── Crear tienda automáticamente al registrarse ───────────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.stores (owner_id, slug)
  values (new.id, 'tienda-' || substr(replace(new.id::text, '-', ''), 1, 8));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Crear pedido y descontar stock en una sola transacción ─────────────────
-- Función interna: la usan create_order (vendedor) y place_web_order (cliente).
-- items: [{ "product_id": "...", "quantity": 2 }, ...]
-- Con p_strict, rechaza productos inactivos o sin stock suficiente (pedidos web);
-- sin p_strict, el vendedor puede dejar el stock en negativo.
create or replace function public._insert_order(
  p_store_id       uuid,
  p_customer_name  text,
  p_customer_phone text,
  p_notes          text,
  p_items          jsonb,
  p_source         text,
  p_strict         boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_item     jsonb;
  v_product  public.products;
  v_qty      integer;
  v_total    numeric(12, 2) := 0;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_ORDER' using hint = 'El pedido no tiene productos';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'INVALID_ORDER' using hint = 'Demasiados productos en un pedido';
  end if;

  insert into public.orders (store_id, customer_name, customer_phone, notes, source)
  values (p_store_id, p_customer_name, p_customer_phone, p_notes, p_source)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 999 then
      raise exception 'INVALID_ORDER' using hint = 'Cantidad inválida';
    end if;

    select * into v_product from public.products
    where id = (v_item ->> 'product_id')::uuid and store_id = p_store_id
    for update;

    if not found or (p_strict and not v_product.active) then
      raise exception 'INVALID_ORDER' using hint = 'Producto inexistente';
    end if;
    if p_strict and v_product.stock < v_qty then
      raise exception 'OUT_OF_STOCK' using hint = v_product.name;
    end if;

    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity)
    values (v_order_id, v_product.id, v_product.name, v_product.price, v_qty);

    update public.products set stock = stock - v_qty where id = v_product.id;
    v_total := v_total + v_product.price * v_qty;
  end loop;

  update public.orders set total = v_total where id = v_order_id;
  return jsonb_build_object('id', v_order_id, 'total', v_total);
end;
$$;
revoke execute on function public._insert_order(uuid, text, text, text, jsonb, text, boolean) from public, anon, authenticated;

-- Pedido cargado por el vendedor desde la app.
create or replace function public.create_order(
  p_customer_name  text,
  p_customer_phone text,
  p_notes          text,
  p_items          jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid := public.my_store_id();
begin
  if v_store_id is null then
    raise exception 'No tenés una tienda';
  end if;
  return (public._insert_order(v_store_id, p_customer_name, p_customer_phone, p_notes, p_items, 'app', false) ->> 'id')::uuid;
end;
$$;
revoke execute on function public.create_order(text, text, text, jsonb) from public, anon;
grant execute on function public.create_order(text, text, text, jsonb) to authenticated;

-- Pedido hecho por un cliente desde el catálogo web (sin login).
-- Precios y stock salen de la base, nunca del navegador. Tiene límites anti-abuso.
create or replace function public.place_web_order(
  p_slug           text,
  p_customer_name  text,
  p_customer_phone text,
  p_notes          text,
  p_items          jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid;
  v_name     text := btrim(coalesce(p_customer_name, ''));
  v_phone    text := regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g');
  v_notes    text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  select id into v_store_id from public.stores where slug = p_slug;
  if v_store_id is null then
    raise exception 'STORE_NOT_FOUND';
  end if;

  if length(v_name) < 2 or length(v_name) > 80 then
    raise exception 'INVALID_ORDER' using hint = 'Nombre inválido';
  end if;
  if length(v_phone) < 8 or length(v_phone) > 15 then
    raise exception 'INVALID_ORDER' using hint = 'Teléfono inválido';
  end if;
  if length(v_notes) > 500 then
    raise exception 'INVALID_ORDER' using hint = 'Aclaración demasiado larga';
  end if;

  -- Anti-abuso: como mucho 5 pedidos por hora por teléfono y 60 por hora por tienda.
  if (select count(*) from public.orders
      where store_id = v_store_id and source = 'web' and customer_phone = v_phone
        and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.orders
         where store_id = v_store_id and source = 'web'
           and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'RATE_LIMIT';
  end if;

  return public._insert_order(v_store_id, v_name, v_phone, v_notes, p_items, 'web', true);
end;
$$;
revoke execute on function public.place_web_order(text, text, text, text, jsonb) from public;
grant execute on function public.place_web_order(text, text, text, text, jsonb) to anon, authenticated;

-- Al cancelar un pedido se devuelve el stock.
create or replace function public.cancel_order(p_order_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.orders set status = 'cancelado'
  where id = p_order_id and store_id = public.my_store_id() and status <> 'cancelado';
  if not found then
    return;
  end if;

  update public.products p set stock = p.stock + oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id;
end;
$$;

-- ─── Fotos de productos (Supabase Storage) ─────────────────────────────────
-- Bucket público de lectura. Cada tienda sólo escribe en su carpeta: <store_id>/archivo.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "dueño sube fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_store_id()::text);

create policy "dueño actualiza fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_store_id()::text);

create policy "dueño borra fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_store_id()::text);

-- ─── Tiempo real: la app se entera al instante de los pedidos nuevos ────────
alter publication supabase_realtime add table public.orders;

-- ─── Permisos: sólo lo que tiene que ser público lo es ─────────────────────
-- Funciones de trigger: nadie las llama por la API.
revoke execute on function public.enforce_free_limits() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- my_store_id y cancel_order sólo para usuarios logueados.
revoke execute on function public.my_store_id() from public, anon;
grant execute on function public.my_store_id() to authenticated;
revoke execute on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;
-- Políticas sólo para usuarios logueados (los clientes usan public_catalog / place_web_order).
alter policy "dueño lee su tienda" on public.stores to authenticated;
alter policy "dueño edita su tienda" on public.stores to authenticated;
alter policy "dueño gestiona productos" on public.products to authenticated;
alter policy "dueño gestiona pedidos" on public.orders to authenticated;
alter policy "dueño gestiona ítems" on public.order_items to authenticated;

-- ─── Rendimiento ────────────────────────────────────────────────────────────
create index if not exists order_items_product_idx on public.order_items (product_id);
-- (select ...) hace que Postgres evalúe la función una sola vez por consulta, no por fila.
alter policy "dueño lee su tienda" on public.stores using (owner_id = (select auth.uid()));
alter policy "dueño edita su tienda" on public.stores
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy "dueño gestiona productos" on public.products
  using (store_id = (select public.my_store_id())) with check (store_id = (select public.my_store_id()));
alter policy "dueño gestiona pedidos" on public.orders
  using (store_id = (select public.my_store_id())) with check (store_id = (select public.my_store_id()));
alter policy "dueño gestiona ítems" on public.order_items
  using (order_id in (select id from public.orders where store_id = (select public.my_store_id())))
  with check (order_id in (select id from public.orders where store_id = (select public.my_store_id())));
