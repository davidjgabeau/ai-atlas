import "server-only";

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type AdminUser = {
  email: string;
  id: string;
};

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email || !isAdminEmail(user.email)) return null;

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle<{ user_id: string }>();

  if (adminError || !adminUser) return null;

  return {
    email: user.email,
    id: user.id,
  };
}

export async function getCurrentUserEmail() {
  const supabase = await createSupabaseAuthServerClient();
  if (!supabase) return "";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email ?? "";
}

export async function requireAdminRequest() {
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    return {
      adminUser: null,
      errorResponse: NextResponse.json(
        {
          ok: false,
          error: "Admin access requires davidgabeau92@gmail.com.",
        },
        { status: 403 },
      ),
    };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return {
      adminUser: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Supabase auth is not configured." },
        { status: 500 },
      ),
    };
  }

  return {
    adminUser,
    errorResponse: null,
    supabase,
  };
}
