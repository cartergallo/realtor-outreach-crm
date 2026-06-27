import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendSms } from "@/lib/twilio";
import { isValidE164 } from "@/lib/phone";
import { log } from "@/lib/logger";
import type { Campaign } from "@/lib/types";

export const maxDuration = 60;

/**
 * Two modes:
 *  1) Campaign send:  { campaignId }  -> sends all APPROVED recipients
 *  2) Direct reply:   { contactId, body } -> sends a one-off (used by inbox)
 * Hard rules enforced here:
 *  - never send to opt_out contacts
 *  - approval required for campaign sends (status must be 'approved')
 *  - store every outbound message
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const fromNumber = profile?.twilio_from_number || process.env.TWILIO_FROM_NUMBER;
  if (!isValidE164(fromNumber ?? null))
    return NextResponse.json(
      { error: "Set a valid Twilio sending number in Settings first." },
      { status: 422 }
    );

  const body = await req.json();

  // -------- Direct reply mode --------
  if (body.contactId && body.body) {
    return sendOne(supabase, user.id, fromNumber!, body.contactId, body.body, null);
  }

  // -------- Campaign send mode --------
  if (!body.campaignId)
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", body.campaignId)
    .single();
  if (!campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("id, contact_id, draft_body, status")
    .eq("campaign_id", body.campaignId)
    .eq("status", "approved");

  if (!recipients || recipients.length === 0)
    return NextResponse.json(
      { error: "No approved recipients. Approve drafts before sending." },
      { status: 422 }
    );

  await supabase
    .from("campaigns")
    .update({ status: "sending" })
    .eq("id", body.campaignId);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of recipients) {
    const result = await sendOneInternal(
      supabase,
      user.id,
      fromNumber!,
      r.contact_id,
      r.draft_body ?? "",
      campaign as Campaign
    );
    if (result.kind === "sent") {
      sent++;
      await supabase
        .from("campaign_recipients")
        .update({ status: "sent", sent_message_id: result.messageId })
        .eq("id", r.id);
    } else if (result.kind === "skipped") {
      skipped++;
      await supabase
        .from("campaign_recipients")
        .update({ status: "skipped" })
        .eq("id", r.id);
    } else {
      failed++;
      await supabase
        .from("campaign_recipients")
        .update({ status: "failed" })
        .eq("id", r.id);
    }
  }

  await supabase
    .from("campaigns")
    .update({ status: "sent" })
    .eq("id", body.campaignId);

  await supabase.from("audit_logs").insert({
    owner_id: user.id,
    action: "campaign.send",
    entity: "campaign",
    entity_id: body.campaignId,
    meta: { sent, skipped, failed },
  });

  return NextResponse.json({ sent, skipped, failed });
}

// Shared: send to one contact, with opt-out guard + message persistence.
type OneResult =
  | { kind: "sent"; messageId: string }
  | { kind: "skipped" }
  | { kind: "failed"; error: string };

async function sendOneInternal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  from: string,
  contactId: string,
  bodyText: string,
  campaign: Campaign | null
): Promise<OneResult> {
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (!contact) return { kind: "failed", error: "Contact not found" };
  if (contact.opt_out) {
    log("info", "send_blocked_optout", { contact: contactId });
    return { kind: "skipped" };
  }
  if (!bodyText.trim()) return { kind: "failed", error: "Empty body" };

  const result = await sendSms({ to: contact.phone, from, body: bodyText });

  // Persist the message regardless of outcome
  const { data: msg } = await supabase
    .from("messages")
    .insert({
      owner_id: ownerId,
      contact_id: contactId,
      campaign_id: campaign?.id ?? null,
      direction: "outbound",
      body: bodyText,
      status: result.ok ? "sent" : "failed",
      from_number: from,
      to_number: contact.phone,
      twilio_sid: result.ok ? result.sid : null,
      error: result.ok ? null : result.error,
    })
    .select("id")
    .single();

  if (!result.ok) return { kind: "failed", error: result.error };
  return { kind: "sent", messageId: msg!.id };
}

// Wrapper for the direct-reply mode that returns an HTTP response.
async function sendOne(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  from: string,
  contactId: string,
  bodyText: string,
  campaign: Campaign | null
) {
  const r = await sendOneInternal(supabase, ownerId, from, contactId, bodyText, campaign);
  if (r.kind === "sent")
    return NextResponse.json({ ok: true, messageId: r.messageId });
  if (r.kind === "skipped")
    return NextResponse.json(
      { ok: false, error: "Contact has opted out." },
      { status: 409 }
    );
  return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
}
