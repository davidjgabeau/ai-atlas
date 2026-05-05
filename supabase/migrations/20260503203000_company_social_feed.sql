alter table public.companies
  add column if not exists x_handle text not null default '',
  add column if not exists x_user_id text not null default '',
  add column if not exists x_last_synced_at timestamptz;

create table if not exists public.company_social_posts (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (id) on delete cascade,
  platform text not null default 'x' check (platform in ('x')),
  external_post_id text not null,
  author_handle text not null default '',
  author_name text not null default '',
  post_text text not null default '',
  post_url text not null default '',
  posted_at timestamptz not null,
  metrics jsonb not null default '{}'::jsonb,
  media jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (platform, external_post_id)
);

create index if not exists company_social_posts_company_posted_idx
on public.company_social_posts (company_id, posted_at desc);

create index if not exists company_social_posts_posted_idx
on public.company_social_posts (posted_at desc);

alter table public.company_social_posts enable row level security;

drop policy if exists "Published company posts are public" on public.company_social_posts;
create policy "Published company posts are public"
on public.company_social_posts for select
using (
  exists (
    select 1
    from public.companies
    where companies.id = company_social_posts.company_id
      and companies.status = 'published'
  )
);

drop policy if exists "Admins can manage company social posts" on public.company_social_posts;
create policy "Admins can manage company social posts"
on public.company_social_posts for all
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
