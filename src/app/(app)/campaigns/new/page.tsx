import { createClient } from "@/lib/supabase-server";
import NewCampaignForm from "@/components/NewCampaignForm";
import type { Tag } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const { data: tags } = await supabase.from("tags").select("*").order("name");
  return <NewCampaignForm tags={(tags as Tag[]) ?? []} />;
}
