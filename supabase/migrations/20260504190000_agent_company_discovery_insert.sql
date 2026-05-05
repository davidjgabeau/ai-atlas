drop policy if exists "Agent can insert companies" on public.companies;
create policy "Agent can insert companies"
on public.companies for insert
with check (private.is_ai_atlas_agent_request());
