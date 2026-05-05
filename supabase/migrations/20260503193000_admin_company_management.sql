create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read their own admin status" on public.admin_users;
create policy "Admins can read their own admin status"
on public.admin_users for select
to authenticated
using ((select auth.uid()) = user_id);

insert into public.admin_users (user_id, email)
select id, lower(email)
from auth.users
where lower(email) = 'davidgabeau92@gmail.com'
on conflict (user_id) do update
set email = excluded.email;

drop policy if exists "Admins can read all companies" on public.companies;
create policy "Admins can read all companies"
on public.companies for select
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can insert companies" on public.companies;
create policy "Admins can insert companies"
on public.companies for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update companies" on public.companies;
create policy "Admins can update companies"
on public.companies for update
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

drop policy if exists "Admins can delete companies" on public.companies;
create policy "Admins can delete companies"
on public.companies for delete
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can read submissions" on public.submissions;
create policy "Admins can read submissions"
on public.submissions for select
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update submissions" on public.submissions;
create policy "Admins can update submissions"
on public.submissions for update
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

drop policy if exists "Admins can manage admin favorites" on public.admin_favorites;
create policy "Admins can manage admin favorites"
on public.admin_favorites for all
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
