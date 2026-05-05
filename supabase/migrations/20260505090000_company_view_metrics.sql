create table if not exists public.company_view_metrics (
  company_id text primary key references public.companies (id) on delete cascade,
  views bigint not null default 0 check (views >= 0),
  last_viewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists company_view_metrics_views_idx
on public.company_view_metrics (views desc);

drop trigger if exists company_view_metrics_set_updated_at on public.company_view_metrics;
create trigger company_view_metrics_set_updated_at
before update on public.company_view_metrics
for each row execute function public.set_updated_at();

alter table public.company_view_metrics enable row level security;

drop policy if exists "Company view metrics are public" on public.company_view_metrics;
create policy "Company view metrics are public"
on public.company_view_metrics for select
using (true);

drop policy if exists "Agent can write company view metrics" on public.company_view_metrics;
create policy "Agent can write company view metrics"
on public.company_view_metrics for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update company view metrics" on public.company_view_metrics;
create policy "Agent can update company view metrics"
on public.company_view_metrics for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Admins can manage company view metrics" on public.company_view_metrics;
create policy "Admins can manage company view metrics"
on public.company_view_metrics for all
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  )
);
