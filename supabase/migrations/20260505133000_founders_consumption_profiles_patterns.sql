alter table public.companies
  add column if not exists founders jsonb not null default '[]'::jsonb,
  add column if not exists consumption_profile text[] not null default '{}'::text[],
  add column if not exists consumption_intensity text not null default 'low',
  add column if not exists consumption_note text not null default '';

alter table public.companies
  drop constraint if exists companies_consumption_intensity_check;

alter table public.companies
  add constraint companies_consumption_intensity_check
  check (consumption_intensity in ('low', 'moderate', 'high', 'very_high'));

alter table public.companies
  drop constraint if exists companies_consumption_profile_check;

alter table public.companies
  add constraint companies_consumption_profile_check
  check (
    consumption_profile <@ array[
      'consumer_inference',
      'agentic_loops',
      'batch_document_processing',
      'realtime_voice',
      'code_generation',
      'multimodal_processing',
      'embeddings_semantic_search'
    ]::text[]
  );

alter table public.companies
  drop constraint if exists companies_category_check;

alter table public.companies
  add constraint companies_category_check
  check (
    category in (
      'Fintech & Trading AI',
      'Legal & Compliance AI',
      'Cybersecurity AI',
      'Media, Ads & Creative AI',
      'Health & Clinical AI',
      'Life Sciences AI',
      'AI-Native Consumer & Social',
      'Agent Infrastructure',
      'Model Tools & Dev Platform',
      'Enterprise GTM & RevOps AI',
      'Data & Memory Layer'
    )
  );

-- Deprecated field retained in live databases to avoid destructive data loss.
-- New application code and generated seeds no longer read or write it.
