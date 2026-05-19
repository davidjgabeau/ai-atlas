import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

const accessTokenSecretName = "x_access_token";
const refreshTokenSecretName = "x_refresh_token";

export type StoredXTokens = {
  accessToken?: string;
  refreshToken?: string;
};

export async function loadStoredXTokens(): Promise<StoredXTokens> {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .schema("private")
    .from("agent_secrets")
    .select("name, secret")
    .in("name", [accessTokenSecretName, refreshTokenSecretName]);

  if (error || !data) return {};

  const tokens: StoredXTokens = {};
  for (const row of data as Array<{ name?: string; secret?: string }>) {
    if (row.name === accessTokenSecretName && row.secret) {
      tokens.accessToken = row.secret;
    }
    if (row.name === refreshTokenSecretName && row.secret) {
      tokens.refreshToken = row.secret;
    }
  }

  return tokens;
}

export async function saveStoredXTokens(tokens: Required<StoredXTokens>) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return false;

  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .schema("private")
    .from("agent_secrets")
    .upsert(
      [
        {
          name: accessTokenSecretName,
          secret: tokens.accessToken,
          updated_at: updatedAt,
        },
        {
          name: refreshTokenSecretName,
          secret: tokens.refreshToken,
          updated_at: updatedAt,
        },
      ],
      { onConflict: "name" },
    );

  return !error;
}
