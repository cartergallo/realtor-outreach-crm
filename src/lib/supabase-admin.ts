import { createClient as createAdminBase } from "@supabase/supabase-js";

// Service-role client. SERVER ONLY. Bypasses RLS — never import in client code.
export function createAdminClient() {
  return createAdminBase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
