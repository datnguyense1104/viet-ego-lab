-- Visitor analytics for the admin dashboard. Run after schema.sql (SQL Editor). Safe to re-run.
-- Page views are written by /api/track (service role). Only admins can read them.
-- Stored per view: random anonymous visitor id, path, referrer host, country code, device type.
-- No IP address, no name, no cookie.

create table if not exists public.page_views (
  id          bigint generated always as identity primary key,
  visitor_id  text not null,
  path        text not null default '/',
  referrer    text not null default '',
  country     text not null default '',
  device      text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists page_views_created_at_idx on public.page_views (created_at);

alter table public.page_views enable row level security;
drop policy if exists "page_views: admin reads" on public.page_views;
create policy "page_views: admin reads" on public.page_views
  for select to authenticated using (public.is_admin());
drop policy if exists "page_views: admin deletes" on public.page_views;
create policy "page_views: admin deletes" on public.page_views
  for delete to authenticated using (public.is_admin());

-- Daily series for the current period and the period before it (Vietnam time).
-- Returns 2 × p_days rows; the first p_days are the previous period.
-- Security invoker: RLS applies, so non-admins get zeros.
create or replace function public.analytics_daily(p_days integer)
returns table (day date, visitors integer, views integer, orders integer, sales bigint)
language sql stable security invoker set search_path = '' as $$
  with days as (
    select generate_series(
      (now() at time zone 'Asia/Ho_Chi_Minh')::date - (2 * p_days - 1),
      (now() at time zone 'Asia/Ho_Chi_Minh')::date,
      interval '1 day')::date as day
  ),
  pv as (
    select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
           count(distinct visitor_id)::integer as visitors, count(*)::integer as views
    from public.page_views
    where created_at >= now() - make_interval(days => 2 * p_days + 1)
    group by 1
  ),
  od as (
    select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
           count(*)::integer as orders, coalesce(sum(total), 0)::bigint as sales
    from public.orders
    where status <> 'cancelled' and created_at >= now() - make_interval(days => 2 * p_days + 1)
    group by 1
  )
  select d.day, coalesce(pv.visitors, 0), coalesce(pv.views, 0), coalesce(od.orders, 0), coalesce(od.sales, 0)
  from days d left join pv using (day) left join od using (day)
  order by d.day;
$$;

-- Period totals. Visitors are distinct across the whole period (not a sum of daily uniques).
create or replace function public.analytics_totals(p_days integer)
returns table (period text, visitors integer, views integer, orders integer, sales bigint)
language sql stable security invoker set search_path = '' as $$
  with bounds as (
    select ((now() at time zone 'Asia/Ho_Chi_Minh')::date - (p_days - 1)) at time zone 'Asia/Ho_Chi_Minh' as cur_start,
           ((now() at time zone 'Asia/Ho_Chi_Minh')::date - (2 * p_days - 1)) at time zone 'Asia/Ho_Chi_Minh' as prev_start
  ),
  tagged_views as (
    select case when v.created_at >= b.cur_start then 'current' else 'previous' end as period, v.visitor_id
    from public.page_views v, bounds b where v.created_at >= b.prev_start
  ),
  tagged_orders as (
    select case when o.created_at >= b.cur_start then 'current' else 'previous' end as period, o.total
    from public.orders o, bounds b where o.created_at >= b.prev_start and o.status <> 'cancelled'
  )
  select p.period,
         (select count(distinct visitor_id)::integer from tagged_views t where t.period = p.period),
         (select count(*)::integer from tagged_views t where t.period = p.period),
         (select count(*)::integer from tagged_orders t where t.period = p.period),
         (select coalesce(sum(total), 0)::bigint from tagged_orders t where t.period = p.period)
  from (values ('current'), ('previous')) as p(period);
$$;

-- Realtime card: active visitors in the last 30 minutes, per-minute series, top countries.
create or replace function public.analytics_realtime()
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with recent as (
    select visitor_id, country, created_at from public.page_views
    where created_at >= now() - interval '30 minutes'
  ),
  minutes as (
    select m, (
      select count(distinct visitor_id) from recent
      where created_at >= date_trunc('minute', now()) - make_interval(mins => m)
        and created_at <  date_trunc('minute', now()) - make_interval(mins => m - 1)
    ) as n
    from generate_series(29, 0, -1) as m
  ),
  countries as (
    select country, count(distinct visitor_id) as n from recent group by country order by n desc, country limit 5
  )
  select jsonb_build_object(
    'active', (select count(distinct visitor_id) from recent),
    'minutes', (select jsonb_agg(n order by m desc) from minutes),
    'countries', coalesce((select jsonb_agg(jsonb_build_object('country', country, 'n', n)) from countries), '[]'::jsonb)
  );
$$;

grant execute on function public.analytics_daily(integer)  to authenticated;
grant execute on function public.analytics_totals(integer) to authenticated;
grant execute on function public.analytics_realtime()      to authenticated;
revoke execute on function public.analytics_daily(integer)  from public, anon;
revoke execute on function public.analytics_totals(integer) from public, anon;
revoke execute on function public.analytics_realtime()      from public, anon;
