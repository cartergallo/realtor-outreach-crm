import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Auth-aware client for Server Components & Route Handlers (respects RLS).
// Next 16: cookies() is async, so this returns a Promise.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: object }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware refreshes instead.
          }
        },
      },
    }
  );
}
