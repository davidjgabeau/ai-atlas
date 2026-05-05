export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
export const SUPABASE_SERVER_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const SUPABASE_AGENT_WRITE_SECRET =
  process.env.SUPABASE_AGENT_WRITE_SECRET ?? process.env.CRON_SECRET ?? "";

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseServerKey() {
  return SUPABASE_SERVER_KEY || SUPABASE_PUBLISHABLE_KEY;
}
