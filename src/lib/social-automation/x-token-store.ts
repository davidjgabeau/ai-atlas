import crypto from "node:crypto";

import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";
import {
  SUPABASE_AGENT_WRITE_SECRET,
  SUPABASE_SERVER_KEY,
} from "@/lib/supabase/env";

const tokenRecordId = "x-oauth-token-store";
const tokenRecordUrl = "https://x.com/AiAtlasNYC/oauth-token-store";
const tokenRecordHash = "x-oauth-token-store-v1";
const encryptedPayloadPrefix = "v1";

export type StoredXTokens = {
  accessToken?: string;
  refreshToken?: string;
};

export async function loadStoredXTokens(): Promise<StoredXTokens> {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("raw_source_records")
    .select("text_content")
    .eq("id", tokenRecordId)
    .maybeSingle();

  if (error || !data?.text_content) return {};

  const tokens = decryptTokens(data.text_content);
  if (!tokens) return {};

  return tokens;
}

export async function saveStoredXTokens(tokens: Required<StoredXTokens>) {
  const supabase = createSupabasePrivilegedClient();
  if (!supabase) return false;

  const textContent = encryptTokens(tokens);
  if (!textContent) return false;

  const discoveredAt = new Date().toISOString();
  const { error } = await supabase
    .from("raw_source_records")
    .upsert(
      {
        id: tokenRecordId,
        source_type: "x",
        url: tokenRecordUrl,
        title: "X OAuth token store",
        text_content: textContent,
        author: "AI Atlas NYC",
        discovered_at: discoveredAt,
        content_hash: tokenRecordHash,
      },
      { onConflict: "id" },
    );

  return !error;
}

function encryptTokens(tokens: Required<StoredXTokens>) {
  const key = getEncryptionKey();
  if (!key) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(tokens), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    encryptedPayloadPrefix,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

function decryptTokens(payload: string): StoredXTokens | null {
  const key = getEncryptionKey();
  if (!key) return null;

  const [version, iv, tag, encrypted] = payload.split(":");
  if (version !== encryptedPayloadPrefix || !iv || !tag || !encrypted) return null;

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]);
    const tokens = JSON.parse(decrypted.toString("utf8")) as StoredXTokens;

    return {
      accessToken: typeof tokens.accessToken === "string" ? tokens.accessToken : undefined,
      refreshToken:
        typeof tokens.refreshToken === "string" ? tokens.refreshToken : undefined,
    };
  } catch {
    return null;
  }
}

function getEncryptionKey() {
  const keyMaterial =
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY ||
    process.env.X_CLIENT_SECRET ||
    SUPABASE_AGENT_WRITE_SECRET ||
    process.env.CRON_SECRET ||
    SUPABASE_SERVER_KEY;

  if (!keyMaterial) return null;

  return crypto.createHash("sha256").update(keyMaterial).digest();
}
