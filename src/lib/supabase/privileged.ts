import { createClient } from "@supabase/supabase-js";

import {
  SUPABASE_AGENT_WRITE_SECRET,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVER_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/env";

export function createSupabasePrivilegedClient() {
  if (!SUPABASE_URL) return null;

  const key = SUPABASE_SERVER_KEY || SUPABASE_PUBLISHABLE_KEY;
  if (!key) return null;

  return createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: SUPABASE_AGENT_WRITE_SECRET
        ? {
            "x-ai-atlas-agent-secret": SUPABASE_AGENT_WRITE_SECRET,
          }
        : {},
    },
  });
}

export function hasSupabasePrivilegedCredentials() {
  return Boolean(SUPABASE_SERVER_KEY || SUPABASE_AGENT_WRITE_SECRET);
}
