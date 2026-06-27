import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { normalizePhone, isValidE164 } from "@/lib/phone";

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const update: Record<string, string | null> = {
    business_name: body.business_name?.trim() || null,
    rep_name: body.rep_name?.trim() || null,
    rep_signature: body.rep_signature?.trim() || null,
  };

  if (body.twilio_from_number) {
    const p = normalizePhone(body.twilio_from_number);
    if (!isValidE164(p))
      return NextResponse.json(
        { error: "Enter a valid phone number in E.164 format, e.g. +17045551234." },
        { status: 422 }
      );
    update.twilio_from_number = p;
  } else {
    update.twilio_from_number = null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("audit_logs").insert({
    owner_id: user.id,
    action: "profile.update",
    entity: "profile",
    entity_id: user.id,
  });

  return NextResponse.json({ profile: data });
}
