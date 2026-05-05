import { revalidatePath } from "next/cache";

import {
  COMPANY_VIEW_METRICS_CACHE_TAG,
  MARKET_COMPANIES_CACHE_TAG,
  MARKET_SUBMISSIONS_CACHE_TAG,
} from "@/lib/cache-tags";
import { safeRevalidateTag } from "@/lib/cache/runtime-cache";

export function revalidateMarketPages(companySlug?: string) {
  revalidateMarketData();

  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath("/categories");
  revalidatePath("/categories/[slug]", "page");
  revalidatePath("/insights");
  revalidatePath("/feed");
  revalidatePath("/admin");

  if (companySlug) {
    revalidatePath(`/companies/${companySlug}`);
  }
}

export function revalidateMarketData() {
  safeRevalidateTag(MARKET_COMPANIES_CACHE_TAG);
  safeRevalidateTag(MARKET_SUBMISSIONS_CACHE_TAG);
  safeRevalidateTag(COMPANY_VIEW_METRICS_CACHE_TAG);
}
