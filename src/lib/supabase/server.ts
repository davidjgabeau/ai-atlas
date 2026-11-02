import { createClient } from "@supabase/supabase-js";
import { fetchWithDatabaseDeadline } from "./fetch";

import {
  SUPABASE_URL,
  getSupabaseServerKey,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;

  return createClient(SUPABASE_URL, getSupabaseServerKey(), {
    global: { fetch: fetchWithDatabaseDeadline },
    auth: {
      persistSession: false,
    },
  });
}
