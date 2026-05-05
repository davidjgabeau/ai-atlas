import { createClient } from "@supabase/supabase-js";

import {
  SUPABASE_URL,
  getSupabaseServerKey,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;

  return createClient(SUPABASE_URL, getSupabaseServerKey(), {
    auth: {
      persistSession: false,
    },
  });
}
