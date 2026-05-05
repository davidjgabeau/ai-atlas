create table if not exists public.raw_source_records (
  id text primary key,
  source_type text not null check (
    source_type in ('website', 'blog', 'press', 'x', 'linkedin', 'jobs', 'search')
  ),
  company_id text references public.companies (id) on delete cascade,
  candidate_company_name text,
  url text not null,
  title text,
  text_content text not null default '',
  author text,
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  content_hash text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.company_events (
  id text primary key,
  company_id text not null references public.companies (id) on delete cascade,
  type text not null check (
    type in (
      'funding',
      'product_launch',
      'customer_signal',
      'hiring_signal',
      'founder_signal',
      'website_change',
      'press',
      'social_post',
      'category_change',
      'new_company_added',
      'traction_signal',
      'partnership',
      'other'
    )
  ),
  title text not null,
  summary text not null default '',
  source_url text not null default '',
  source_name text not null default '',
  occurred_at timestamptz not null,
  discovered_at timestamptz not null default now(),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  importance_score numeric not null default 0,
  novelty_score numeric not null default 0,
  relevance_score numeric not null default 0,
  final_score numeric not null default 0,
  extracted_facts jsonb not null default '{}'::jsonb,
  content_hash text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.market_snapshots (
  id text primary key,
  generated_at timestamptz not null,
  company_count integer not null default 0,
  category_counts jsonb not null default '{}'::jsonb,
  stage_counts jsonb not null default '{}'::jsonb,
  recent_company_ids text[] not null default '{}',
  recent_event_ids text[] not null default '{}',
  top_categories jsonb not null default '[]'::jsonb,
  top_signals jsonb not null default '[]'::jsonb,
  source_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.editorial_surfaces (
  id text primary key,
  surface text not null check (
    surface in (
      'companies_to_know',
      'current_read',
      'market_snapshot',
      'category_pulse',
      'recently_added',
      'latest_signals'
    )
  ),
  generated_at timestamptz not null,
  expires_at timestamptz not null,
  items jsonb not null default '[]'::jsonb,
  source_event_ids text[] not null default '{}',
  source_company_ids text[] not null default '{}',
  source_snapshot_ids text[] not null default '{}',
  model text,
  prompt_version text not null default '',
  source_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.candidate_updates (
  id text primary key,
  company_id text references public.companies (id) on delete cascade,
  candidate_company_name text,
  proposed_update jsonb not null default '{}'::jsonb,
  reason text not null default '',
  source_urls text[] not null default '{}',
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.company_exposures (
  id text primary key,
  company_id text not null references public.companies (id) on delete cascade,
  surface text not null,
  shown_at timestamptz not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.generated_insight_history (
  id text primary key,
  title text not null,
  body text not null default '',
  generated_at timestamptz not null,
  source_company_ids text[] not null default '{}',
  source_event_ids text[] not null default '{}',
  embedding jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id text primary key,
  job text not null check (job in ('refresh', 'discover', 'editorial', 'all')),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  status text not null check (status in ('success', 'partial', 'failed')),
  stats jsonb not null default '{}'::jsonb,
  errors text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists raw_source_records_company_idx on public.raw_source_records (company_id);
create index if not exists company_events_company_idx on public.company_events (company_id);
create index if not exists company_events_discovered_idx on public.company_events (discovered_at desc);
create index if not exists company_events_score_idx on public.company_events (final_score desc);
create index if not exists market_snapshots_generated_idx on public.market_snapshots (generated_at desc);
create index if not exists editorial_surfaces_surface_generated_idx on public.editorial_surfaces (surface, generated_at desc);
create index if not exists candidate_updates_status_idx on public.candidate_updates (status, created_at desc);
create index if not exists company_exposures_company_idx on public.company_exposures (company_id, shown_at desc);
create index if not exists agent_runs_job_idx on public.agent_runs (job, started_at desc);

alter table public.raw_source_records enable row level security;
alter table public.company_events enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.editorial_surfaces enable row level security;
alter table public.candidate_updates enable row level security;
alter table public.company_exposures enable row level security;
alter table public.generated_insight_history enable row level security;
alter table public.agent_runs enable row level security;

drop policy if exists "Editorial source records are service-only" on public.raw_source_records;
create policy "Editorial source records are service-only"
on public.raw_source_records for select
using (false);

drop policy if exists "Company events are public" on public.company_events;
create policy "Company events are public"
on public.company_events for select
using (true);

drop policy if exists "Market snapshots are public" on public.market_snapshots;
create policy "Market snapshots are public"
on public.market_snapshots for select
using (true);

drop policy if exists "Editorial surfaces are public" on public.editorial_surfaces;
create policy "Editorial surfaces are public"
on public.editorial_surfaces for select
using (true);

drop policy if exists "Candidate updates are service-only" on public.candidate_updates;
create policy "Candidate updates are service-only"
on public.candidate_updates for select
using (false);

drop policy if exists "Company exposures are service-only" on public.company_exposures;
create policy "Company exposures are service-only"
on public.company_exposures for select
using (false);

drop policy if exists "Generated insight history is service-only" on public.generated_insight_history;
create policy "Generated insight history is service-only"
on public.generated_insight_history for select
using (false);

drop policy if exists "Agent runs are service-only" on public.agent_runs;
create policy "Agent runs are service-only"
on public.agent_runs for select
using (false);
