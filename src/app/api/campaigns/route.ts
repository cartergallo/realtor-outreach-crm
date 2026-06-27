import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { log } from "@/lib/logger";

type Segment = {
  tag_ids?: string[];
  brokerage?: string;
  community?: string;
};

// POST: create campaign and snapshot recipients (active contacts only).
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, offer, community, template } = body;
  const segment: Segment = body.segment ?? {};

  if (!name?.trim())
    return NextResponse.json({ error: "Campaign name is required." }, { status: 422 });

  // 1) Create campaign
  const { data: campaign, error: cErr } = await supabase
    .from("campaigns")
    .insert({
      owner_id: user.id,
      name: name.trim(),
      offer: offer?.trim() || null,
      community: community?.trim() || null,
      template: template?.trim() || null,
      segment,
      status: "draft",
    })
    .select()
    .single();

  if (cErr) {
    log("error", "campaign_create_failed", { error: cErr.message });
    return NextResponse.json({ error: cErr.message }, { status: 400 });
  }

  // 2) Resolve segment -> active, non-opted-out contacts
  let query = supabase
    .from("contacts")
    .select("id")
    .eq("owner_id", user.id)
    .eq("opt_out", false);

  if (segment.brokerage) query = query.ilike("brokerage", `%${segment.brokerage}%`);
  if (segment.community) query = query.ilike("community", `%${segment.community}%`);

  const { data: contacts, error: ctErr } = await query;
  if (ctErr)
    return NextResponse.json({ error: ctErr.message }, { status: 400 });

  let contactIds = (contacts ?? []).map((c) => c.id);

  // Tag filter (intersection)
  if (segment.tag_ids && segment.tag_ids.length > 0) {
    const { data: tagged } = await supabase
      .from("contact_tags")
      .select("contact_id")
      .in("tag_id", segment.tag_ids);
    const allowed = new Set((tagged ?? []).map((t) => t.contact_id));
    contactIds = contactIds.filter((id) => allowed.has(id));
  }

  // 3) Insert recipients
  if (contactIds.length > 0) {
    const recipients = contactIds.map((id) => ({
      owner_id: user.id,
      campaign_id: campaign.id,
      contact_id: id,
      status: "pending" as const,
    }));
    const { error: rErr } = await supabase
      .from("campaign_recipients")
      .insert(recipients);
    if (rErr)
      return NextResponse.json({ error: rErr.message }, { status: 400 });
  }

  await supabase.from("audit_logs").insert({
    owner_id: user.id,
    action: "campaign.create",
    entity: "campaign",
    entity_id: campaign.id,
    meta: { recipients: contactIds.length },
  });

  return NextResponse.json({
    campaign,
    recipientCount: contactIds.length,
  });
}
