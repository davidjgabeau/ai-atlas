create extension if not exists pgcrypto;

create table if not exists public.companies (
  id text primary key,
  name text not null,
  slug text not null unique,
  logo_url text not null default '',
  website_url text not null default '',
  founder_name text,
  office_address text not null default '',
  funding_round text not null default '',
  funding_amount text not null default '',
  funding_date text not null default '',
  total_raised text not null default '',
  lead_investor text not null default '',
  funding_note text not null default '',
  category text not null check (
    category in (
      'Fintech & Trading AI',
      'Legal & Compliance AI',
      'Media, Ads & Creative AI',
      'Health & Clinical AI',
      'AI-Native Consumer & Social',
      'Agent Infrastructure',
      'Model Tools & Dev Platform',
      'Enterprise GTM & RevOps AI',
      'Data & Memory Layer'
    )
  ),
  stage text not null default '',
  short_description text not null default '',
  one_line_thesis text not null default '',
  why_it_matters text not null default '',
  ai_usage_profile text not null default '',
  openai_fit text not null default '',
  usage_potential text not null check (
    usage_potential in (
      'Emerging',
      'Promising',
      'High Potential',
      'Breakout Watch'
    )
  ),
  recent_activity_text text not null default '',
  recent_activity_date timestamptz not null default now(),
  is_featured boolean not null default false,
  is_breakout boolean not null default false,
  status text not null default 'draft' check (
    status in ('draft', 'published', 'archived')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  generated jsonb not null default '{}'::jsonb
);

create index if not exists companies_status_idx on public.companies (status);
create index if not exists companies_category_idx on public.companies (category);
create index if not exists companies_updated_at_idx on public.companies (updated_at desc);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  website_url text not null,
  founder_name text not null default '',
  email text not null,
  description text not null default '',
  usage_potential text check (
    usage_potential in (
      'Emerging',
      'Promising',
      'High Potential',
      'Breakout Watch'
    )
  ),
  status text not null default 'new' check (
    status in ('new', 'accepted', 'rejected')
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  name text not null,
  one_line_bio text not null default '',
  avatar_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_companies (
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id text not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create table if not exists public.admin_favorites (
  user_handle text not null,
  company_id text not null references public.companies (id) on delete cascade,
  rank integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_handle, company_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.submissions enable row level security;
alter table public.profiles enable row level security;
alter table public.saved_companies enable row level security;
alter table public.admin_favorites enable row level security;

drop policy if exists "Published companies are public" on public.companies;
create policy "Published companies are public"
on public.companies for select
using (status = 'published');

drop policy if exists "Public visitors can submit companies" on public.submissions;
create policy "Public visitors can submit companies"
on public.submissions for insert
with check (true);

drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable"
on public.profiles for select
using (true);

drop policy if exists "Users can manage their own profile" on public.profiles;
create policy "Users can manage their own profile"
on public.profiles for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Saved companies are readable" on public.saved_companies;
create policy "Saved companies are readable"
on public.saved_companies for select
using (true);

drop policy if exists "Users can manage their saved companies" on public.saved_companies;
create policy "Users can manage their saved companies"
on public.saved_companies for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Admin favorites are public" on public.admin_favorites;
create policy "Admin favorites are public"
on public.admin_favorites for select
using (true);
