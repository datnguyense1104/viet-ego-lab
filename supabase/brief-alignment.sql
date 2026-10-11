-- Align the catalog and journal with the website brief. Run after schema.sql (SQL Editor). Safe to re-run.
--   * Products gain the fields the brief's product page needs; price/volume become optional
--     (brief: never publish unconfirmed price, notes or ingredients).
--   * The placeholder catalog is replaced by the 5 products named in the brief.
--     Past orders keep their item names/prices (order_items stores a copy).
--   * New `articles` table for the Scent Journal, managed from /admin.

-- ---------- Products ----------
alter table public.products add column if not exists collection   text not null default '';
alter table public.products add column if not exists scent_family text not null default '';
alter table public.products add column if not exists description  text not null default '';
alter table public.products add column if not exists usage        text not null default '';
alter table public.products add column if not exists info         text not null default '';
alter table public.products add column if not exists gallery      text[] not null default '{}';
alter table public.products alter column price drop not null;
alter table public.products drop constraint if exists products_cat_check;
alter table public.products drop column if exists cat;
alter table public.products drop column if exists mood;

-- Unpriced products can be shown but never ordered.
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
      where id = v_item->>'id' and is_active and price is not null;
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

-- Replace the placeholder catalog with the brief's 5 products. Only "Cốm xanh Hà Nội" has confirmed
-- price, volume and description; the others stay empty until the brand confirms them.
delete from public.products
 where id not in ('com-xanh-ha-noi', 'sen-dong-thap', 'phu-sa-cuu-long', 'hat-ca-phe-tay-nguyen', 'long-tra-da-lat');

insert into public.products (id, name, region, description, price, size, img, img2, sort_order) values
  ('com-xanh-ha-noi', 'Cốm xanh Hà Nội', 'Hà Nội',
   'Lấy cảm hứng từ cốm xanh Hà Nội, tái hiện hương thơm thanh mát, dịu ngọt của lúa non trong một dấu hương đậm bản sắc Việt.',
   890000, '100ml',
   'https://images.unsplash.com/photo-1705899853374-d91c048b81d2?w=1000&q=75&auto=format&fit=crop',
   'https://images.unsplash.com/photo-1561504935-4e7d4516a2d1?w=1000&q=75&auto=format&fit=crop', 0),
  ('sen-dong-thap', 'Sen Đồng Tháp', 'Đồng Tháp', '', null, '',
   'https://images.unsplash.com/photo-1615108395437-df128ad79e80?w=1000&q=75&auto=format&fit=crop',
   'https://images.unsplash.com/photo-1538998073820-4dfa76300194?w=1000&q=75&auto=format&fit=crop', 1),
  ('phu-sa-cuu-long', 'Phù Sa Cửu Long', 'Đồng bằng sông Cửu Long', '', null, '',
   'https://images.unsplash.com/photo-1733660227163-01bc46e0d7d7?w=1000&q=75&auto=format&fit=crop',
   'https://images.unsplash.com/photo-1589562337460-9d825d2cd5a2?w=1000&q=75&auto=format&fit=crop', 2),
  ('hat-ca-phe-tay-nguyen', 'Hạt cà phê Tây Nguyên', 'Tây Nguyên', '', null, '',
   'https://images.unsplash.com/photo-1635796332668-78830169097d?w=1000&q=75&auto=format&fit=crop',
   'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1000&q=75&auto=format&fit=crop', 3),
  ('long-tra-da-lat', 'Long Trà Đà Lạt', 'Đà Lạt', '', null, '',
   'https://images.unsplash.com/photo-1594125311687-3b1b3eafa9f4?w=1000&q=75&auto=format&fit=crop',
   'https://images.unsplash.com/photo-1764141738717-896b3365c196?w=1000&q=75&auto=format&fit=crop', 4)
on conflict (id) do nothing;

-- ---------- Scent Journal ----------
-- status: draft (admin only) · coming_soon (title/cover shown, no body) · published
create table if not exists public.articles (
  id              bigint generated always as identity primary key,
  slug            text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title           text not null,
  category        text not null check (category in
                    ('nghe-thuat-mui-huong', 'huong-viet-va-ky-uc', 'mui-huong-va-ban-sac', 'nhat-ky-sang-tao')),
  excerpt         text not null default '',
  cover           text,
  body            text not null default '',
  read_minutes    integer check (read_minutes is null or read_minutes > 0),
  status          text not null default 'draft' check (status in ('draft', 'coming_soon', 'published')),
  related_product text references public.products (id) on delete set null,
  published_at    timestamptz,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();

alter table public.articles enable row level security;
drop policy if exists "articles: public reads visible" on public.articles;
create policy "articles: public reads visible" on public.articles
  for select to anon, authenticated using (status in ('coming_soon', 'published') or public.is_admin());
drop policy if exists "articles: admin writes" on public.articles;
create policy "articles: admin writes" on public.articles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- The brief's suggested launch topics. They are topics, not written articles: coming_soon, no body.
insert into public.articles (slug, title, category, cover, status, sort_order) values
  ('neu-viet-nam-co-mot-mui-huong', 'Nếu Việt Nam có một mùi hương, đó sẽ là gì?', 'huong-viet-va-ky-uc',
   'https://images.unsplash.com/photo-1609412058473-c199497c3c5d?w=1000&q=75&auto=format&fit=crop', 'coming_soon', 0),
  ('com-sen-va-ky-uc-khuu-giac', 'Cốm, sen và những ký ức được lưu giữ bằng khứu giác', 'huong-viet-va-ky-uc',
   'https://images.unsplash.com/photo-1538998073820-4dfa76300194?w=1000&q=75&auto=format&fit=crop', 'coming_soon', 1),
  ('mui-huong-va-ban-sac-ca-nhan', 'Mùi hương có thể nói gì về bản sắc cá nhân?', 'mui-huong-va-ban-sac',
   'https://images.unsplash.com/photo-1726067438466-df7db360f4e3?w=1000&q=75&auto=format&fit=crop', 'coming_soon', 2),
  ('mui-huong-va-noi-da-xa', 'Vì sao có những mùi hương khiến ta nhớ về một nơi đã xa?', 'nghe-thuat-mui-huong',
   'https://images.unsplash.com/photo-1536511671359-849531c0a576?w=1000&q=75&auto=format&fit=crop', 'coming_soon', 3),
  ('lua-chon-mui-huong-phu-hop', 'Nghệ thuật lựa chọn mùi hương phù hợp với chính mình', 'nghe-thuat-mui-huong',
   'https://images.unsplash.com/photo-1682251008222-412b140cbf4f?w=1000&q=75&auto=format&fit=crop', 'coming_soon', 4)
on conflict (slug) do nothing;
