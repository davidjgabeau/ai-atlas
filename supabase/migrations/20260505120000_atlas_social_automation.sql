create table if not exists public.atlas_social_posts (
  id text primary key,
  source_kind text not null check (
    source_kind in (
      'company_update',
      'job_alert',
      'company_news',
      'category_movement',
      'current_read',
      'evergreen_spotlight'
    )
  ),
  status text not null default 'draft' check (
    status in (
      'draft',
      'queued',
      'scheduled',
      'publishing',
      'published',
      'failed',
      'canceled',
      'skipped'
    )
  ),
  post_text text not null default '',
  scheduled_for timestamptz,
  published_at timestamptz,
  external_post_id text,
  external_post_url text not null default '',
  company_id text references public.companies (id) on delete set null,
  source_company_ids text[] not null default '{}',
  source_event_ids text[] not null default '{}',
  source_job_ids text[] not null default '{}',
  source_news_ids text[] not null default '{}',
  source_snapshot_ids text[] not null default '{}',
  source_urls text[] not null default '{}',
  tagged_handles text[] not null default '{}',
  model text,
  prompt_version text not null default '',
  source_hash text not null unique,
  safety_notes text[] not null default '{}',
  decision_log jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  score numeric not null default 0,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists atlas_social_posts_status_schedule_idx
on public.atlas_social_posts (status, scheduled_for asc nulls last);

create index if not exists atlas_social_posts_published_idx
on public.atlas_social_posts (published_at desc nulls last);

create index if not exists atlas_social_posts_company_idx
on public.atlas_social_posts (company_id, created_at desc);

create index if not exists atlas_social_posts_kind_created_idx
on public.atlas_social_posts (source_kind, created_at desc);

create index if not exists atlas_social_posts_company_status_created_idx
on public.atlas_social_posts (company_id, status, created_at desc);

drop trigger if exists atlas_social_posts_set_updated_at on public.atlas_social_posts;
create trigger atlas_social_posts_set_updated_at
before update on public.atlas_social_posts
for each row execute function public.set_updated_at();

create table if not exists public.atlas_social_runs (
  id text primary key,
  task text not null check (
    task in ('generate', 'dispatch', 'engagement', 'health_check')
  ),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  status text not null check (status in ('success', 'partial', 'failed', 'skipped')),
  stats jsonb not null default '{}'::jsonb,
  errors text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists atlas_social_runs_task_started_idx
on public.atlas_social_runs (task, started_at desc);

create table if not exists public.atlas_social_targets (
  id text primary key,
  entity_type text not null check (entity_type in ('company')),
  entity_id text not null references public.companies (id) on delete cascade,
  platform text not null default 'x' check (platform in ('x')),
  handle text not null,
  confidence text not null default 'unverified' check (
    confidence in ('unverified', 'manual', 'verified', 'failed')
  ),
  source_url text not null default '',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, platform),
  unique (platform, handle)
);

create index if not exists atlas_social_targets_confidence_idx
on public.atlas_social_targets (platform, confidence, last_verified_at asc nulls first);

drop trigger if exists atlas_social_targets_set_updated_at on public.atlas_social_targets;
create trigger atlas_social_targets_set_updated_at
before update on public.atlas_social_targets
for each row execute function public.set_updated_at();

create table if not exists public.atlas_social_engagement_actions (
  id text primary key,
  target_external_post_id text not null,
  action text not null check (action in ('like', 'repost', 'reply', 'quote')),
  status text not null default 'queued' check (
    status in ('queued', 'skipped', 'completed', 'failed')
  ),
  reason text not null default '',
  company_id text references public.companies (id) on delete set null,
  source_social_post_id uuid references public.company_social_posts (id) on delete cascade,
  source_post_url text not null default '',
  generated_text text not null default '',
  posted_at timestamptz,
  external_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (action, target_external_post_id)
);

create index if not exists atlas_social_engagement_status_created_idx
on public.atlas_social_engagement_actions (status, created_at desc);

create table if not exists public.atlas_social_dispatch_logs (
  id text primary key,
  run_type text not null check (
    run_type in ('generate', 'dispatch', 'engagement', 'health_check', 'admin')
  ),
  selected_event_id text,
  selected_post_id text references public.atlas_social_posts (id) on delete set null,
  selected_engagement_id text references public.atlas_social_engagement_actions (id) on delete set null,
  decision text not null,
  notes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists atlas_social_dispatch_logs_created_idx
on public.atlas_social_dispatch_logs (created_at desc);

drop trigger if exists atlas_social_engagement_actions_set_updated_at on public.atlas_social_engagement_actions;
create trigger atlas_social_engagement_actions_set_updated_at
before update on public.atlas_social_engagement_actions
for each row execute function public.set_updated_at();

alter table public.atlas_social_posts enable row level security;
alter table public.atlas_social_runs enable row level security;
alter table public.atlas_social_targets enable row level security;
alter table public.atlas_social_engagement_actions enable row level security;
alter table public.atlas_social_dispatch_logs enable row level security;

drop policy if exists "Atlas social posts are private" on public.atlas_social_posts;
create policy "Atlas social posts are private"
on public.atlas_social_posts for select
using (false);

drop policy if exists "Agent can read atlas social posts" on public.atlas_social_posts;
create policy "Agent can read atlas social posts"
on public.atlas_social_posts for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write atlas social posts" on public.atlas_social_posts;
create policy "Agent can write atlas social posts"
on public.atlas_social_posts for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update atlas social posts" on public.atlas_social_posts;
create policy "Agent can update atlas social posts"
on public.atlas_social_posts for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Admins can manage atlas social posts" on public.atlas_social_posts;
create policy "Admins can manage atlas social posts"
on public.atlas_social_posts for all
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

drop policy if exists "Atlas social runs are private" on public.atlas_social_runs;
create policy "Atlas social runs are private"
on public.atlas_social_runs for select
using (false);

drop policy if exists "Agent can read atlas social runs" on public.atlas_social_runs;
create policy "Agent can read atlas social runs"
on public.atlas_social_runs for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write atlas social runs" on public.atlas_social_runs;
create policy "Agent can write atlas social runs"
on public.atlas_social_runs for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Admins can manage atlas social runs" on public.atlas_social_runs;
create policy "Admins can manage atlas social runs"
on public.atlas_social_runs for all
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

drop policy if exists "Atlas social engagement actions are private" on public.atlas_social_engagement_actions;
create policy "Atlas social engagement actions are private"
on public.atlas_social_engagement_actions for select
using (false);

drop policy if exists "Agent can read atlas social engagement actions" on public.atlas_social_engagement_actions;
create policy "Agent can read atlas social engagement actions"
on public.atlas_social_engagement_actions for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write atlas social engagement actions" on public.atlas_social_engagement_actions;
create policy "Agent can write atlas social engagement actions"
on public.atlas_social_engagement_actions for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update atlas social engagement actions" on public.atlas_social_engagement_actions;
create policy "Agent can update atlas social engagement actions"
on public.atlas_social_engagement_actions for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Admins can manage atlas social engagement actions" on public.atlas_social_engagement_actions;
create policy "Admins can manage atlas social engagement actions"
on public.atlas_social_engagement_actions for all
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

drop policy if exists "Atlas social targets are private" on public.atlas_social_targets;
create policy "Atlas social targets are private"
on public.atlas_social_targets for select
using (false);

drop policy if exists "Agent can read atlas social targets" on public.atlas_social_targets;
create policy "Agent can read atlas social targets"
on public.atlas_social_targets for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write atlas social targets" on public.atlas_social_targets;
create policy "Agent can write atlas social targets"
on public.atlas_social_targets for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update atlas social targets" on public.atlas_social_targets;
create policy "Agent can update atlas social targets"
on public.atlas_social_targets for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Admins can manage atlas social targets" on public.atlas_social_targets;
create policy "Admins can manage atlas social targets"
on public.atlas_social_targets for all
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

drop policy if exists "Atlas social dispatch logs are private" on public.atlas_social_dispatch_logs;
create policy "Atlas social dispatch logs are private"
on public.atlas_social_dispatch_logs for select
using (false);

drop policy if exists "Agent can read atlas social dispatch logs" on public.atlas_social_dispatch_logs;
create policy "Agent can read atlas social dispatch logs"
on public.atlas_social_dispatch_logs for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write atlas social dispatch logs" on public.atlas_social_dispatch_logs;
create policy "Agent can write atlas social dispatch logs"
on public.atlas_social_dispatch_logs for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Admins can manage atlas social dispatch logs" on public.atlas_social_dispatch_logs;
create policy "Admins can manage atlas social dispatch logs"
on public.atlas_social_dispatch_logs for all
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
