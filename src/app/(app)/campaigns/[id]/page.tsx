import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import CampaignReview from "@/components/CampaignReview";
import type { Campaign, CampaignRecipient, Contact } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();
  if (!campaign) notFound();

  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("*")
    .eq("campaign_id", id)
    .order("created_at");

  const contactIds = (recipients ?? []).map((r) => r.contact_id);
  const { data: contacts } = contactIds.length
    ? await supabase.from("contacts").select("*").in("id", contactIds)
    : { data: [] as Contact[] };

  return (
    <div>
      <Link href="/campaigns" className="text-sm text-muted hover:text-ink">
        ← Back to campaigns
      </Link>
      <CampaignReview
        campaign={campaign as Campaign}
        initialRecipients={(recipients as CampaignRecipient[]) ?? []}
        contacts={(contacts as Contact[]) ?? []}
      />
    </div>
  );
}
