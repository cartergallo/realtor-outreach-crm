// supabase/functions/twilio-send
// Optional: send a single SMS from a trusted backend context.
// Deploy: supabase functions deploy twilio-send
// Requires a valid user JWT in Authorization header (verify_jwt on).
import { admin, normalizePhone } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized" }, 401);

  const sb = admin();
  const { data: userData } = await sb.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  let payload: { contactId?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!payload.contactId || !payload.body)
    return json({ error: "contactId and body are required" }, 400);

  const { data: profile } = await sb
    .from("profiles")
    .select("twilio_from_number")
    .eq("id", user.id)
    .single();
  const from =
    profile?.twilio_from_number ?? Deno.env.get("TWILIO_FROM_NUMBER") ?? "";
  if (!from) return json({ error: "No sending number configured" }, 422);

  const { data: contact } = await sb
    .from("contacts")
    .select("*")
    .eq("id", payload.contactId)
    .eq("owner_id", user.id)
    .single();
  if (!contact) return json({ error: "Contact not found" }, 404);
  if (contact.opt_out) return json({ error: "Contact has opted out" }, 409);

  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const tok = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({
    To: contact.phone,
    From: from,
    Body: payload.body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${sid}:${tok}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const data = await res.json();

  await sb.from("messages").insert({
    owner_id: user.id,
    contact_id: contact.id,
    direction: "outbound",
    body: payload.body,
    status: res.ok ? "sent" : "failed",
    from_number: from,
    to_number: contact.phone,
    twilio_sid: res.ok ? data.sid : null,
    error: res.ok ? null : data?.message ?? "send failed",
  });

  if (!res.ok) return json({ error: data?.message ?? "Twilio error" }, 400);
  return json({ ok: true, sid: data.sid });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
