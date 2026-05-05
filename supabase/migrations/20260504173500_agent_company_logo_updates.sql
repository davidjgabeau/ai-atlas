drop policy if exists "Agent can update companies" on public.companies;
create policy "Agent can update companies"
on public.companies for update
using (private.is_ai_atlas_agent_request())
with check (private.is_ai_atlas_agent_request());
