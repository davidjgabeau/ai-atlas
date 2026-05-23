import {
  getSocialAutomationConfig,
  getSocialConfigSnapshot,
} from "@/lib/social-automation/config";
import {
  saveDispatchLog,
  saveSocialRun,
  upsertSocialTarget,
} from "@/lib/social-automation/store";
import { getCompanyXHandle } from "@/lib/social/companyXHandles";
import { verifyHandle } from "@/lib/social-automation/x-client";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

type CompanyHandleRow = {
  id: string;
  name: string;
  slug: string;
  x_handle: string;
  website_url?: string;
};

export async function verifySocialHandles(limit = 10) {
  const startedAt = new Date().toISOString();
  const config = getSocialAutomationConfig();
  const errors: string[] = [];

  if (config.killSwitch) {
    await saveSocialRun({
      task: "health_check",
      startedAt,
      status: "skipped",
      stats: getSocialConfigSnapshot(config),
      errors: ["SOCIAL_KILL_SWITCH is enabled."],
    });
    return {
      ok: true,
      status: "skipped" as const,
      verified: 0,
      failed: 0,
      errors: ["SOCIAL_KILL_SWITCH is enabled."],
    };
  }

  const supabase = createSupabasePrivilegedClient();
  if (!supabase) {
    return {
      ok: false,
      status: "failed" as const,
      verified: 0,
      failed: 0,
      errors: ["Supabase privileged credentials are not configured."],
    };
  }

  const { data, error } = await supabase
    .from("companies")
    .select("id,name,slug,x_handle,website_url")
    .eq("status", "published")
    .order("x_last_synced_at", { ascending: true, nullsFirst: true })
    .limit(200);

  if (error || !data) {
    return {
      ok: false,
      status: "failed" as const,
      verified: 0,
      failed: 0,
      errors: [error?.message ?? "Unable to load company handles."],
    };
  }

  let verified = 0;
  let failed = 0;

  const companiesToVerify = (data as CompanyHandleRow[])
    .map((company) => ({
      ...company,
      x_handle: getCompanyXHandle({
        slug: company.slug,
        currentHandle: company.x_handle,
      }),
    }))
    .filter((company) => company.x_handle)
    .slice(0, Math.max(1, Math.min(limit, 25)));

  for (const company of companiesToVerify) {
    const normalizedHandle = normalizeHandle(company.x_handle);
    if (!normalizedHandle) continue;

    const result = await verifyHandle({ handle: normalizedHandle, config });
    if (result.ok && result.user) {
      verified += 1;
      const verifiedAt = new Date().toISOString();
      await upsertSocialTarget({
        companyId: company.id,
        handle: result.handle ?? normalizedHandle,
        confidence: "verified",
        sourceUrl: company.website_url ?? "",
        lastVerifiedAt: verifiedAt,
      });
      await supabase
        .from("companies")
        .update({
          x_handle: result.handle ?? normalizedHandle,
          x_user_id: result.user.id,
          x_last_synced_at: verifiedAt,
        })
        .eq("id", company.id);
      await saveDispatchLog({
        runType: "health_check",
        decision: "handle_verified",
        notes: [company.name, `@${result.handle ?? normalizedHandle}`],
      });
    } else {
      failed += 1;
      const reason = result.reason ?? `Unable to verify @${normalizedHandle}.`;
      errors.push(`${company.name}: ${reason}`);
      await upsertSocialTarget({
        companyId: company.id,
        handle: normalizedHandle,
        confidence: "failed",
        sourceUrl: company.website_url ?? "",
        lastVerifiedAt: new Date().toISOString(),
      });
      await saveDispatchLog({
        runType: "health_check",
        decision: "handle_verification_failed",
        notes: [company.name, reason],
      });
    }
  }

  const status = errors.length > 0 ? (verified > 0 ? "partial" : "failed") : "success";
  await saveSocialRun({
    task: "health_check",
    startedAt,
    status,
    stats: {
      ...getSocialConfigSnapshot(config),
      checked: companiesToVerify.length,
      verified,
      failed,
    },
    errors,
  });

  return {
    ok: status !== "failed",
    status,
    verified,
    failed,
    errors,
  };
}

function normalizeHandle(value: string) {
  return value.replace(/^@/, "").trim();
}
