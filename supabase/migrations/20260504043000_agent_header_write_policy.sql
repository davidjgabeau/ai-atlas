create schema if not exists private;

create table if not exists private.agent_secrets (
  name text primary key,
  secret text not null,
  updated_at timestamptz not null default now()
);

alter table private.agent_secrets enable row level security;

drop policy if exists "Agent secrets stay private" on private.agent_secrets;
create policy "Agent secrets stay private"
on private.agent_secrets for all
using (false)
with check (false);

create or replace function private.is_ai_atlas_agent_request()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb
      ->> 'x-ai-atlas-agent-secret',
    ''
  ) = coalesce(
    (
      select private.agent_secrets.secret
      from private.agent_secrets
      where private.agent_secrets.name = 'agent_write'
    ),
    ''
  );
$$;

revoke all on function private.is_ai_atlas_agent_request() from public;
grant execute on function private.is_ai_atlas_agent_request() to anon, authenticated;

drop policy if exists "Agent can read raw source records" on public.raw_source_records;
create policy "Agent can read raw source records"
on public.raw_source_records for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write raw source records" on public.raw_source_records;
create policy "Agent can write raw source records"
on public.raw_source_records for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update raw source records" on public.raw_source_records;
create policy "Agent can update raw source records"
on public.raw_source_records for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write company events" on public.company_events;
create policy "Agent can write company events"
on public.company_events for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update company events" on public.company_events;
create policy "Agent can update company events"
on public.company_events for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write market snapshots" on public.market_snapshots;
create policy "Agent can write market snapshots"
on public.market_snapshots for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update market snapshots" on public.market_snapshots;
create policy "Agent can update market snapshots"
on public.market_snapshots for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write editorial surfaces" on public.editorial_surfaces;
create policy "Agent can write editorial surfaces"
on public.editorial_surfaces for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update editorial surfaces" on public.editorial_surfaces;
create policy "Agent can update editorial surfaces"
on public.editorial_surfaces for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can read candidate updates" on public.candidate_updates;
create policy "Agent can read candidate updates"
on public.candidate_updates for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write candidate updates" on public.candidate_updates;
create policy "Agent can write candidate updates"
on public.candidate_updates for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update candidate updates" on public.candidate_updates;
create policy "Agent can update candidate updates"
on public.candidate_updates for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can read company exposures" on public.company_exposures;
create policy "Agent can read company exposures"
on public.company_exposures for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write company exposures" on public.company_exposures;
create policy "Agent can write company exposures"
on public.company_exposures for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update company exposures" on public.company_exposures;
create policy "Agent can update company exposures"
on public.company_exposures for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can read insight history" on public.generated_insight_history;
create policy "Agent can read insight history"
on public.generated_insight_history for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write insight history" on public.generated_insight_history;
create policy "Agent can write insight history"
on public.generated_insight_history for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update insight history" on public.generated_insight_history;
create policy "Agent can update insight history"
on public.generated_insight_history for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can read agent runs" on public.agent_runs;
create policy "Agent can read agent runs"
on public.agent_runs for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write agent runs" on public.agent_runs;
create policy "Agent can write agent runs"
on public.agent_runs for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update agent runs" on public.agent_runs;
create policy "Agent can update agent runs"
on public.agent_runs for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());
