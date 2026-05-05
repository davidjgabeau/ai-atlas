create table if not exists public.news_items (
  id text primary key,
  title text not null,
  summary text not null default '',
  source_url text not null unique,
  source_name text not null default '',
  source_domain text not null default '',
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  scope text not null default 'broad' check (scope in ('nyc', 'broad')),
  topic text not null default '',
  relevance_score numeric not null default 0,
  image_url text,
  status text not null default 'published' check (status in ('published', 'hidden')),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_items_status_published_idx
on public.news_items (status, published_at desc nulls last, discovered_at desc);

create index if not exists news_items_scope_published_idx
on public.news_items (scope, published_at desc nulls last, discovered_at desc);

drop trigger if exists news_items_set_updated_at on public.news_items;
create trigger news_items_set_updated_at
before update on public.news_items
for each row execute function public.set_updated_at();

alter table public.news_items enable row level security;

drop policy if exists "Published news items are public" on public.news_items;
create policy "Published news items are public"
on public.news_items for select
using (status = 'published');

drop policy if exists "Agent can read news items" on public.news_items;
create policy "Agent can read news items"
on public.news_items for select
using (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can write news items" on public.news_items;
create policy "Agent can write news items"
on public.news_items for insert
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Agent can update news items" on public.news_items;
create policy "Agent can update news items"
on public.news_items for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());

drop policy if exists "Admins can manage news items" on public.news_items;
create policy "Admins can manage news items"
on public.news_items for all
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
