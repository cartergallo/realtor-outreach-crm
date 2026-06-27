import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizePhone, isValidE164 } from "@/lib/phone";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

// The exact consent wording shown on the form. Stored with each opt-in
// as the legal record. Keep this in sync with the landing page copy.
const CONSENT_TEXT =
  "I agree to receive recurring marketing text messages from Alago about Lennar Houston offers and scheduling. Msg & data rates may apply. Reply STOP to opt out at any time.";

// PUBLIC endpoint (no auth). Accepts a single opt-in from the landing page.
export async function POST(req: Request) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields. If present, silently accept and drop.
  if (body.company_website) {
    return NextResponse.json({ ok: true });
  }

  const phone = normalizePhone(body.phone ?? "");
  if (!isValidE164(phone)) {
    return NextResponse.json(
      { error: "Please enter a valid mobile number." },
      { status: 422 }
    );
  }
  if (!body.consent) {
    return NextResponse.json(
      { error: "Please check the box to agree to receive texts." },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  // Single-rep app: attach opt-ins to the one profile.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!profile) {
    log("error", "optin_no_profile", {});
    return NextResponse.json(
      { error: "We're not able to take sign-ups right now." },
      { status: 503 }
    );
  }

  // Capture IP for the consent record (best effort).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const row = {
    owner_id: profile.id,
    first_name: body.first_name?.trim() || null,
    last_name: body.last_name?.trim() || null,
    phone,
    email: body.email?.trim() || null,
    brokerage: body.brokerage?.trim() || null,
    notes: "Opted in via landing page",
    consent_status: "opted_in",
    consent_source: "landing_page",
    consent_method: "web_form_checkbox",
    consent_text: CONSENT_TEXT,
    consent_timestamp: new Date().toISOString(),
    consent_ip: ip,
  };

  // Upsert on (owner_id, phone): re-opt-in updates the existing record.
  const { error } = await supabase
    .from("contacts")
    .upsert(row, { onConflict: "owner_id,phone", ignoreDuplicates: false });

  if (error) {
    log("error", "optin_insert_failed", { error: error.message });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  await supabase.from("audit_logs").insert({
    owner_id: profile.id,
    action: "contact.opt_in_web",
    entity: "contact",
    meta: { source: "landing_page", phone },
  });

  return NextResponse.json({ ok: true });
}
