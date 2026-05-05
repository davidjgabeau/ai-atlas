import { NextResponse } from "next/server";

import { companyToDatabasePayload } from "@/lib/admin-company-record";
import { revalidateMarketPages } from "@/lib/admin-revalidate";
import { requireAdminRequest } from "@/lib/admin-server";
import {
  enrichCompanyPayloadWithDiscoveredXHandle,
  saveDiscoveredXHandleTarget,
} from "@/lib/social-automation/handle-discovery";
import { normalizeCompany } from "@/lib/supabase/market-data";
import type { Company } from "@/types/market";

export async function POST(request: Request) {
  const { errorResponse, supabase } = await requireAdminRequest();
  if (errorResponse) return errorResponse;

  const payload = (await request.json().catch(() => null)) as Partial<Company> | null;

  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "Missing company payload." },
      { status: 400 },
    );
  }

  const { payload: companyPayload, discovery } =
    await enrichCompanyPayloadWithDiscoveredXHandle(
      companyToDatabasePayload(payload),
    );

  const { data, error } = await supabase
    .from("companies")
    .upsert(companyPayload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  revalidateMarketPages(data.slug);
  await saveDiscoveredXHandleTarget({
    companyId: data.id,
    discovery,
  });

  return NextResponse.json({
    ok: true,
    company: normalizeCompany(data),
  });
}
