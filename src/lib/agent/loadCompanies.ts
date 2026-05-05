import { createClient } from "@supabase/supabase-js";

import { companies as localCompanies } from "../../data/market";
import type { Company } from "../../types/market";
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "../supabase/env";
import { normalizeCompany } from "../supabase/market-data";

type CompanyRow = Partial<Company>;

export async function loadPublishedCompaniesForAgent(): Promise<Company[]> {
  if (!isSupabaseConfigured()) {
    return localCompanies.filter((company) => company.status === "published");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.warn("Agent company loader using local fallback:", error?.message);
    return localCompanies.filter((company) => company.status === "published");
  }

  return (data as CompanyRow[]).map(normalizeCompany);
}
