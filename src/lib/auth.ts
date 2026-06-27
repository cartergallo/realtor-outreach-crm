import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/types";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getProfile(): Promise<{
  profile: Profile | null;
  userId: string;
}> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return { profile: (data as Profile) ?? null, userId: user.id };
}
