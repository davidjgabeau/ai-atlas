create or replace function public.seeded_company_view_count(p_company_id text)
returns integer
language sql
immutable
as $$
  select (
    12 + (
      (('x' || substr(md5(coalesce(p_company_id, '')), 1, 8))::bit(32)::bigint % 88)
    )
  )::integer;
$$;

create or replace function public.increment_company_view_metric(
  p_company_id text,
  p_baseline_views integer default null
)
returns table (
  company_id text,
  views bigint,
  last_viewed_at timestamptz
)
language sql
volatile
as $$
  insert into public.company_view_metrics as metrics (
    company_id,
    views,
    last_viewed_at
  )
  values (
    p_company_id,
    greatest(
      coalesce(p_baseline_views, public.seeded_company_view_count(p_company_id)),
      public.seeded_company_view_count(p_company_id)
    ) + 1,
    now()
  )
  on conflict (company_id) do update
    set views = greatest(metrics.views, excluded.views - 1) + 1,
        last_viewed_at = excluded.last_viewed_at
  returning metrics.company_id, metrics.views, metrics.last_viewed_at;
$$;

revoke all on function public.seeded_company_view_count(text) from public;
grant execute on function public.seeded_company_view_count(text) to anon, authenticated, service_role;

revoke all on function public.increment_company_view_metric(text, integer) from public;
grant execute on function public.increment_company_view_metric(text, integer) to anon, authenticated, service_role;

insert into public.company_view_metrics (
  company_id,
  views,
  last_viewed_at
)
select
  companies.id,
  public.seeded_company_view_count(companies.id),
  now()
from public.companies
where companies.status = 'published'
on conflict (company_id) do update
  set views = greatest(
        public.company_view_metrics.views,
        excluded.views
      ),
      last_viewed_at = coalesce(
        public.company_view_metrics.last_viewed_at,
        excluded.last_viewed_at
      );
