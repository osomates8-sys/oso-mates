-- Esquema de base de datos para Vendé (Supabase / Postgres).
-- Pegalo en Supabase → SQL Editor y ejecutalo una vez.

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
-- (sin costo). Uso: select * from public_catalog('mi-tienda');
create or replace function public.public_catalog(p_slug text)
returns table (store_name text, whatsapp text, product_id uuid, name text, description text, price numeric, in_stock boolean)
language sql stable security definer set search_path = public as $$
  select s.name, s.whatsapp, p.id, p.name, p.description, p.price, p.stock > 0
  from public.stores s join public.products p on p.store_id = s.id
  where s.slug = p_slug and p.active
  order by p.name
$$;
grant execute on function public.public_catalog(text) to anon;

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
-- items: [{ "product_id": "...", "quantity": 2 }, ...]
create or replace function public.create_order(
  p_customer_name  text,
  p_customer_phone text,
  p_notes          text,
  p_items          jsonb
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_store_id uuid := public.my_store_id();
  v_order_id uuid;
  v_item     jsonb;
  v_product  public.products;
  v_qty      integer;
  v_total    numeric(12, 2) := 0;
begin
  if v_store_id is null then
    raise exception 'No tenés una tienda';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;

  insert into public.orders (store_id, customer_name, customer_phone, notes)
  values (v_store_id, p_customer_name, p_customer_phone, p_notes)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;

    select * into v_product from public.products
    where id = (v_item ->> 'product_id')::uuid and store_id = v_store_id
    for update;

    if not found then
      raise exception 'Producto inexistente';
    end if;

    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity)
    values (v_order_id, v_product.id, v_product.name, v_product.price, v_qty);

    update public.products set stock = stock - v_qty where id = v_product.id;
    v_total := v_total + v_product.price * v_qty;
  end loop;

  update public.orders set total = v_total where id = v_order_id;
  return v_order_id;
end;
$$;

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
