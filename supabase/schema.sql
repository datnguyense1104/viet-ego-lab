-- Việt Ego Lab database schema. Run once in Supabase Dashboard → SQL Editor.
-- Access model:
--   * anon (storefront) can only read active products.
--   * Orders and newsletter sign-ups are written by the Vercel API with the service-role key.
--   * Users listed in public.admins manage everything through the /admin page.

-- ---------- Tables ----------
create table if not exists public.products (
  id          text primary key,
  cat         text not null check (cat in ('edp', 'edt', 'set', 'home')),
  name        text not null,
  region      text not null default '',
  mood        text not null default '',
  notes       text not null default '',
  story       text not null default '',
  price       integer not null check (price >= 0),
  size        text not null default '',
  hue         integer not null default 90,
  img         text,
  img2        text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id            bigint generated always as identity primary key,
  code          text unique,
  customer_name text not null,
  phone         text not null,
  email         text not null default '',
  address       text not null,
  note          text not null default '',
  total         integer not null check (total >= 0),
  status        text not null default 'new'
                check (status in ('new', 'confirmed', 'shipping', 'done', 'cancelled')),
  created_at    timestamptz not null default now()
);

create table if not exists public.order_items (
  id         bigint generated always as identity primary key,
  order_id   bigint not null references public.orders (id) on delete cascade,
  product_id text references public.products (id) on delete set null,
  name       text not null,
  price      integer not null,
  qty        integer not null check (qty > 0)
);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

create table if not exists public.subscribers (
  email      text primary key,
  created_at timestamptz not null default now()
);

-- Keep products.updated_at current on every edit.
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------- Admin check ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Row Level Security ----------
alter table public.products    enable row level security;
alter table public.admins      enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.subscribers enable row level security;

drop policy if exists "products: public reads active" on public.products;
create policy "products: public reads active" on public.products
  for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists "products: admin writes" on public.products;
create policy "products: admin writes" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins: see own row" on public.admins;
create policy "admins: see own row" on public.admins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "orders: admin manages" on public.orders;
create policy "orders: admin manages" on public.orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items: admin manages" on public.order_items;
create policy "order_items: admin manages" on public.order_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "subscribers: admin manages" on public.subscribers;
create policy "subscribers: admin manages" on public.subscribers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Order creation (server only) ----------
-- Prices come from the products table, never from the client. Runs atomically.
-- p_items: [{"id": "edp-com", "qty": 2}, ...]
create or replace function public.create_order(p_customer jsonb, p_items jsonb)
returns table (order_code text, order_total integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_order_id bigint;
  v_total    integer := 0;
  v_item     jsonb;
  v_product  public.products%rowtype;
  v_qty      integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  insert into public.orders (customer_name, phone, email, address, note, total)
  values (p_customer->>'name', p_customer->>'phone', coalesce(p_customer->>'email', ''),
          p_customer->>'address', coalesce(p_customer->>'note', ''), 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products
      where id = v_item->>'id' and is_active;
    if not found then raise exception 'PRODUCT_UNAVAILABLE:%', v_item->>'id'; end if;
    v_qty := (v_item->>'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 20 then raise exception 'BAD_QTY'; end if;

    insert into public.order_items (order_id, product_id, name, price, qty)
    values (v_order_id, v_product.id, v_product.name, v_product.price, v_qty);
    v_total := v_total + v_product.price * v_qty;
  end loop;

  update public.orders
     set total = v_total,
         code  = 'VEL' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || '-' || lpad(v_order_id::text, 4, '0')
   where id = v_order_id
  returning code, total into order_code, order_total;
  return next;
end $$;
revoke all on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb) to service_role;

-- ---------- Storage for product photos ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product-images: admin uploads" on storage.objects;
create policy "product-images: admin uploads" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product-images: admin updates" on storage.objects;
create policy "product-images: admin updates" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product-images: admin deletes" on storage.objects;
create policy "product-images: admin deletes" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
