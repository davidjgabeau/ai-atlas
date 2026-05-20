import { buildLlmsTxt } from "@/lib/seo/llms";
import { getPublishedCompanies } from "@/lib/supabase/market-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const companies = await getPublishedCompanies();

  return new Response(buildLlmsTxt(companies), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
