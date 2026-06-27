import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { draftMessage } from "@/lib/claude";
import { log } from "@/lib/logger";
import type { Campaign, Contact, Profile } from "@/lib/types";

export const maxDuration = 60;

// POST { campaignId } -> drafts every recipient that still needs one.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId, regenerate } = await req.json();
  if (!campaignId)
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  if (!campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Recipients to draft
  let q = supabase
    .from("campaign_recipients")
    .select("id, contact_id, status, draft_body")
    .eq("campaign_id", campaignId);
  if (!regenerate) q = q.eq("status", "pending");

  const { data: recipients } = await q;
  if (!recipients || recipients.length === 0)
    return NextResponse.json({ drafted: 0 });

  const contactIds = recipients.map((r) => r.contact_id);
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .in("id", contactIds);
  const byId = new Map((contacts ?? []).map((c) => [c.id, c as Contact]));

  let drafted = 0;
  let failed = 0;

  // Sequential to stay within rate limits; small campaigns for one rep.
  for (const r of recipients) {
    const contact = byId.get(r.contact_id);
    if (!contact || contact.opt_out) {
      await supabase
        .from("campaign_recipients")
        .update({ status: "skipped" })
        .eq("id", r.id);
      continue;
    }
    try {
      const { body } = await draftMessage(
        contact,
        campaign as Campaign,
        (profile as Profile) ?? null
      );
      await supabase
        .from("campaign_recipients")
        .update({ draft_body: body, status: "drafted" })
        .eq("id", r.id);
      drafted++;
    } catch (e) {
      failed++;
      log("error", "draft_loop_failed", {
        recipient: r.id,
        error: (e as Error).message,
      });
      await supabase
        .from("campaign_recipients")
        .update({ status: "failed" })
        .eq("id", r.id);
    }
  }

  await supabase
    .from("campaigns")
    .update({ status: "review" })
    .eq("id", campaignId);

  await supabase.from("audit_logs").insert({
    owner_id: user.id,
    action: "campaign.generate_drafts",
    entity: "campaign",
    entity_id: campaignId,
    meta: { drafted, failed },
  });

  return NextResponse.json({ drafted, failed });
}
