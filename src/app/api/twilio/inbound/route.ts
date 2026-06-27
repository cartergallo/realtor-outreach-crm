import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { validateTwilioSignature } from "@/lib/twilio-verify";
import { isOptOut, isOptIn } from "@/lib/optout";
import { normalizePhone } from "@/lib/phone";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Twilio posts application/x-www-form-urlencoded. This route is PUBLIC
// (excluded from auth middleware) and must verify the Twilio signature.
export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const signature = req.headers.get("x-twilio-signature");

  const raw = await req.text();
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<
    string,
    string
  >;

  // Reconstruct the exact URL Twilio signed.
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") +
    "/api/twilio/inbound";

  const valid = validateTwilioSignature(authToken, signature, url, params);
  if (!valid && process.env.NODE_ENV === "production") {
    log("warn", "twilio_inbound_bad_signature", { from: params.From });
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = normalizePhone(params.From ?? "");
  const to = normalizePhone(params.To ?? "");
  const body = (params.Body ?? "").trim();
  const sid = params.MessageSid ?? params.SmsSid ?? null;

  if (!from) {
    return twiml(); // ack and ignore
  }

  const supabase = createAdminClient();

  // Find the owning contact by the destination (To) number + phone match.
  // The To number maps to a user's profile.twilio_from_number.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, twilio_from_number")
    .eq("twilio_from_number", to)
    .maybeSingle();

  // Fallback: env default number -> first profile (single-rep app).
  let ownerId = profile?.id ?? null;
  if (!ownerId) {
    const { data: anyProfile } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .maybeSingle();
    ownerId = anyProfile?.id ?? null;
  }
  if (!ownerId) {
    log("error", "twilio_inbound_no_owner", { to });
    return twiml();
  }

  // Match or create the contact for this owner.
  let { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("phone", from)
    .maybeSingle();

  if (!contact) {
    const { data: created } = await supabase
      .from("contacts")
      .insert({ owner_id: ownerId, phone: from, notes: "Created from inbound SMS" })
      .select()
      .single();
    contact = created;
  }

  // Opt-out / opt-in keyword handling.
  let replyText: string | null = null;
  if (isOptOut(body)) {
    await supabase
      .from("contacts")
      .update({ opt_out: true, status: "opt_out" })
      .eq("id", contact!.id);
    await supabase.from("audit_logs").insert({
      owner_id: ownerId,
      action: "contact.opt_out",
      entity: "contact",
      entity_id: contact!.id,
      meta: { keyword: body.toUpperCase() },
    });
    replyText =
      "You're unsubscribed and won't receive more messages. Reply START to opt back in.";
    log("info", "inbound_opt_out", { contact: contact!.id });
  } else if (isOptIn(body)) {
    await supabase
      .from("contacts")
      .update({ opt_out: false, status: "active" })
      .eq("id", contact!.id);
    await supabase.from("audit_logs").insert({
      owner_id: ownerId,
      action: "contact.opt_in",
      entity: "contact",
      entity_id: contact!.id,
    });
    replyText = "You're opted back in. Thanks!";
  }

  // Always store the inbound message.
  await supabase.from("messages").insert({
    owner_id: ownerId,
    contact_id: contact!.id,
    direction: "inbound",
    body: body || "(empty)",
    status: "received",
    from_number: from,
    to_number: to,
    twilio_sid: sid,
  });

  return twiml(replyText);
}

// Return TwiML. If replyText is set, Twilio sends it as an auto-response.
function twiml(message?: string | null) {
  const inner = message
    ? `<Message>${escapeXml(message)}</Message>`
    : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
