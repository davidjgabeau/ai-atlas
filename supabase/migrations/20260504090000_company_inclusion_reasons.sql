alter table public.companies
  add column if not exists discovery_reason jsonb,
  add column if not exists inclusion_reason jsonb;
