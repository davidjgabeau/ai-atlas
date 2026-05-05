create table if not exists public.newsletter_subscribers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  subscribed boolean not null default true,
  source text not null default 'profile',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_subscribers_email_check check (
    length(trim(email)) between 3 and 320
    and position('@' in email) > 1
  )
);

create unique index if not exists newsletter_subscribers_email_lower_idx
on public.newsletter_subscribers (lower(email));

create index if not exists newsletter_subscribers_subscribed_created_at_idx
on public.newsletter_subscribers (subscribed, created_at desc);

drop trigger if exists newsletter_subscribers_set_updated_at on public.newsletter_subscribers;
create trigger newsletter_subscribers_set_updated_at
before update on public.newsletter_subscribers
for each row execute function public.set_updated_at();

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Users can read their newsletter subscription" on public.newsletter_subscribers;
create policy "Users can read their newsletter subscription"
on public.newsletter_subscribers for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their newsletter subscription" on public.newsletter_subscribers;
create policy "Users can create their newsletter subscription"
on public.newsletter_subscribers for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their newsletter subscription" on public.newsletter_subscribers;
create policy "Users can update their newsletter subscription"
on public.newsletter_subscribers for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their newsletter subscription" on public.newsletter_subscribers;
create policy "Users can delete their newsletter subscription"
on public.newsletter_subscribers for delete
to authenticated
using ((select auth.uid()) = user_id);
