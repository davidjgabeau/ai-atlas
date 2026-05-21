import { NextResponse } from "next/server";

import { companyToDatabasePayload } from "@/lib/admin-company-record";
import { getPublishedCompanies } from "@/lib/supabase/market-data";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import {
  createSupabasePrivilegedClient,
  hasSupabasePrivilegedCredentials,
} from "@/lib/supabase/privileged";
import type { Company } from "@/types/market";

export const dynamic = "force-dynamic";

type SaveCompanyPayload = {
  companyId?: string;
};

export async function POST(request: Request) {
  return mutateSavedCompany(request, "save");
}

export async function DELETE(request: Request) {
  return mutateSavedCompany(request, "delete");
}

async function mutateSavedCompany(
  request: Request,
  action: "save" | "delete",
) {
  const authClient = await createSupabaseAuthServerClient();
  if (!authClient) {
    return jsonError("Profile accounts are not configured yet.", 503);
  }

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return jsonError("Sign in before saving companies.", 401);
  }

  const companyId = await getCompanyIdFromRequest(request);
  if (!companyId) {
    return jsonError("Company id is required.", 400);
  }

  const company = await getPublicCompanyById(companyId);
  if (!company) {
    return jsonError("Company is not available to save.", 404);
  }

  const privilegedClient = createSupabasePrivilegedClient();
  const canWritePrivileged = Boolean(
    privilegedClient && hasSupabasePrivilegedCredentials(),
  );

  let savedCompanyId = company.id;

  if (action === "save") {
    const ensureResult = await ensureCompanyRowForSave(company);
    if (!ensureResult.ok) {
      return jsonError(ensureResult.error, ensureResult.status);
    }

    savedCompanyId = ensureResult.companyId;
  } else {
    try {
      savedCompanyId = (await getExistingCompanyRowId(company)) ?? company.id;
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Unable to verify company.",
        500,
      );
    }
  }

  const writeClient = canWritePrivileged ? privilegedClient : authClient;
  if (!writeClient) {
    return jsonError("Profile accounts are not configured yet.", 503);
  }

  const result =
    action === "save"
      ? await writeClient
          .from("saved_companies")
          .upsert(
            { user_id: user.id, company_id: savedCompanyId },
            { onConflict: "user_id,company_id" },
          )
      : await writeClient
          .from("saved_companies")
          .delete()
          .match({ user_id: user.id, company_id: savedCompanyId });

  if (result.error) {
    return jsonError(result.error.message, 500);
  }

  return NextResponse.json({
    ok: true,
    companyId: savedCompanyId,
    saved: action === "save",
  });
}

async function getCompanyIdFromRequest(request: Request) {
  try {
    const payload = (await request.json()) as SaveCompanyPayload;
    return typeof payload.companyId === "string" ? payload.companyId.trim() : "";
  } catch {
    return "";
  }
}

async function getPublicCompanyById(companyId: string) {
  const companies = await getPublishedCompanies();
  return companies.find((company) => company.id === companyId) ?? null;
}

async function ensureCompanyRowForSave(company: Company): Promise<
  | { ok: true; companyId: string }
  | {
      ok: false;
      error: string;
      status: number;
    }
> {
  const privilegedClient = createSupabasePrivilegedClient();
  const hasPrivilegedWrites = hasSupabasePrivilegedCredentials();
  const lookupClient = privilegedClient;

  if (!lookupClient) {
    return {
      ok: false,
      error: "Profile accounts are not configured yet.",
      status: 503,
    };
  }

  let existingCompanyId: string | null = null;

  try {
    existingCompanyId = await getExistingCompanyRowId(company);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to verify company.",
      status: 500,
    };
  }

  if (existingCompanyId) return { ok: true, companyId: existingCompanyId };

  if (!hasPrivilegedWrites) {
    return {
      ok: false,
      error: "Company record is still syncing. Try again shortly.",
      status: 503,
    };
  }

  const { error: upsertError } = await lookupClient
    .from("companies")
    .upsert(companyToDatabasePayload(company), { onConflict: "id" });

  if (upsertError) {
    return {
      ok: false,
      error: upsertError.message,
      status: 500,
    };
  }

  return { ok: true, companyId: company.id };
}

async function getExistingCompanyRowId(company: Company) {
  const lookupClient = createSupabasePrivilegedClient();
  if (!lookupClient) return null;

  const { data, error } = await lookupClient
    .from("companies")
    .select("id,slug")
    .or(`id.eq.${company.id},slug.eq.${company.slug}`)
    .limit(2);

  if (error) throw new Error(error.message);

  const existingRows = (data ?? []) as Array<{ id?: string; slug?: string }>;
  const existingRow =
    existingRows.find((row) => row.id === company.id) ??
    existingRows.find((row) => row.slug === company.slug);

  return existingRow?.id ?? null;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
