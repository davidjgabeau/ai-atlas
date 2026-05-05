import { NextResponse } from "next/server";

import {
  companyPatchToDatabasePayload,
  companyToDatabasePayload,
} from "@/lib/admin-company-record";
import { revalidateMarketPages } from "@/lib/admin-revalidate";
import { requireAdminRequest } from "@/lib/admin-server";
import { normalizeCompany } from "@/lib/supabase/market-data";
import type { Company } from "@/types/market";

type RouteContext = {
  params: Promise<{
    companyId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { companyId } = await context.params;
  const { errorResponse, supabase } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const payload = (await request.json().catch(() => null)) as Partial<Company> | null;

  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "Missing company updates." },
      { status: 400 },
    );
  }

  let companyPayload = companyPatchToDatabasePayload(payload);

  if (Object.keys(companyPayload).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No valid company updates provided." },
      { status: 400 },
    );
  }

  if (shouldRefreshGenerated(companyPayload)) {
    const { data: existingCompany, error: existingError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (existingError || !existingCompany) {
      return NextResponse.json(
        {
          ok: false,
          error: existingError?.message ?? "Company not found.",
        },
        { status: 404 },
      );
    }

    const refreshedCompany = companyToDatabasePayload({
      ...normalizeCompany(existingCompany),
      ...(payload as Partial<Company>),
    });

    companyPayload = {
      ...companyPayload,
      generated: refreshedCompany.generated,
      inclusion_reason: refreshedCompany.inclusion_reason,
    };
  }

  const { data, error } = await supabase
    .from("companies")
    .update(companyPayload)
    .eq("id", companyId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  revalidateMarketPages(data.slug);

  return NextResponse.json({
    ok: true,
    company: normalizeCompany(data),
  });
}

function shouldRefreshGenerated(payload: Record<string, unknown>) {
  return [
    "name",
    "category",
    "stage",
    "funding_round",
    "funding_amount",
    "funding_date",
    "total_raised",
    "lead_investor",
    "funding_note",
    "short_description",
    "one_line_thesis",
    "why_it_matters",
    "ai_usage_profile",
    "openai_fit",
    "founders",
    "consumption_profile",
    "consumption_intensity",
    "consumption_note",
    "recent_activity_text",
    "recent_activity_date",
    "is_breakout",
  ].some((field) => field in payload);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { companyId } = await context.params;
  const { errorResponse, supabase } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const { data: existingCompany } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", companyId)
    .maybeSingle<{ slug: string }>();

  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", companyId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  revalidateMarketPages(existingCompany?.slug);

  return NextResponse.json({ ok: true });
}
