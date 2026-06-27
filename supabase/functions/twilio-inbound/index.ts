// supabase/functions/twilio-inbound
// Deploy: supabase functions deploy twilio-inbound --no-verify-jwt
// Set as your Twilio "A MESSAGE COMES IN" webhook (POST).
import {
  admin,
  normalizePhone,
  word,
  OPT_OUT,
  OPT_IN,
  validTwilioSignature,
  twiml,
} from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const signature = req.headers.get("x-twilio-signature");
  const raw = await req.text();
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;

  const url =
    (Deno.env.get("PUBLIC_WEBHOOK_BASE") ?? "").replace(/\/$/, "") +
    "/twilio-inbound";

  const ok = await validTwilioSignature(authToken, signature, url, params);
  if (!ok && Deno.env.get("ALLOW_UNSIGNED") !== "true") {
    return new Response("Invalid signature", { status: 403 });
  }

  const from = normalizePhone(params.From ?? "");
  const to = normalizePhone(params.To ?? "");
  const body = (params.Body ?? "").trim();
  const sid = params.MessageSid ?? params.SmsSid ?? null;
  if (!from) return twiml();

  const sb = admin();

  // Resolve owner via the receiving number, else fall back to the single rep.
  let ownerId: string | null = null;
  const { data: profile } = await sb
    .from("profiles")
    .select("id")
    .eq("twilio_from_number", to)
    .maybeSingle();
  ownerId = profile?.id ?? null;
  if (!ownerId) {
    const { data: anyP } = await sb.from("profiles").select("id").limit(1).maybeSingle();
    ownerId = anyP?.id ?? null;
  }
  if (!ownerId) return twiml();

  // Match or create the contact.
  let { data: contact } = await sb
    .from("contacts")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("phone", from)
    .maybeSingle();
  if (!contact) {
    const { data: created } = await sb
      .from("contacts")
      .insert({ owner_id: ownerId, phone: from, notes: "Created from inbound SMS" })
      .select()
      .single();
    contact = created;
  }

  const w = word(body);
  let reply: string | null = null;

  if (OPT_OUT.includes(w)) {
    await sb.from("contacts").update({ opt_out: true, status: "opt_out" }).eq("id", contact!.id);
    await sb.from("audit_logs").insert({
      owner_id: ownerId,
      action: "contact.opt_out",
      entity: "contact",
      entity_id: contact!.id,
      meta: { keyword: w },
    });
    reply = "You're unsubscribed and won't receive more messages. Reply START to opt back in.";
  } else if (OPT_IN.includes(w)) {
    await sb.from("contacts").update({ opt_out: false, status: "active" }).eq("id", contact!.id);
    await sb.from("audit_logs").insert({
      owner_id: ownerId,
      action: "contact.opt_in",
      entity: "contact",
      entity_id: contact!.id,
    });
    reply = "You're opted back in. Thanks!";
  }

  await sb.from("messages").insert({
    owner_id: ownerId,
    contact_id: contact!.id,
    direction: "inbound",
    body: body || "(empty)",
    status: "received",
    from_number: from,
    to_number: to,
    twilio_sid: sid,
  });

  return twiml(reply);
});
