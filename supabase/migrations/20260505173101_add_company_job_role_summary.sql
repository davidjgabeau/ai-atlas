alter table public.company_jobs
add column if not exists role_summary text not null default '';

comment on column public.company_jobs.role_summary is
  'Short cleaned description of the role extracted from the source job listing.';
