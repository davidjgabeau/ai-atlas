create table if not exists public.company_jobs (
  id text primary key,
  company_id text not null references public.companies (id) on delete cascade,
  title text not null,
  department text not null default '',
  location text not null default '',
  employment_type text not null default '',
  remote_policy text not null default '',
  source_url text not null,
  source_name text not null default 'Company careers',
  external_id text not null default '',
  posted_at timestamptz,
  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'closed')),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, source_url)
);

create index if not exists company_jobs_company_idx
on public.company_jobs (company_id);

create index if not exists company_jobs_status_seen_idx
on public.company_jobs (status, last_seen_at desc);

create index if not exists company_jobs_discovered_idx
on public.company_jobs (discovered_at desc);

drop trigger if exists company_jobs_set_updated_at on public.company_jobs;
create trigger company_jobs_set_updated_at
before update on public.company_jobs
for each row execute function public.set_updated_at();

alter table public.company_jobs enable row level security;

drop policy if exists "Authenticated users can read company jobs" on public.company_jobs;
create policy "Authenticated users can read company jobs"
on public.company_jobs for select
to authenticated
using (
  status = 'open'
  and exists (
    select 1
    from public.companies
    where companies.id = company_jobs.company_id
      and companies.status = 'published'
  )
);

drop policy if exists "Agent can read company jobs" on public.company_jobs;
create policy "Agent can read company jobs"
on public.company_jobs for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write company jobs" on public.company_jobs;
create policy "Agent can write company jobs"
on public.company_jobs for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update company jobs" on public.company_jobs;
create policy "Agent can update company jobs"
on public.company_jobs for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Admins can manage company jobs" on public.company_jobs;
create policy "Admins can manage company jobs"
on public.company_jobs for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
