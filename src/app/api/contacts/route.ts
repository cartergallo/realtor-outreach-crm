import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { normalizePhone, isValidE164 } from "@/lib/phone";
import { log } from "@/lib/logger";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// POST: create one contact
export async function POST(req: Request) {
  const { supabase, user } = await ctx();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone ?? "");
  if (!isValidE164(phone)) {
    return NextResponse.json(
      { error: "A valid phone number is required." },
      { status: 422 }
    );
  }

  const row = {
    owner_id: user.id,
    first_name: body.first_name?.trim() || null,
    last_name: body.last_name?.trim() || null,
    phone,
    email: body.email?.trim() || null,
    brokerage: body.brokerage?.trim() || null,
    community: body.community?.trim() || null,
    notes: body.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("contacts")
    .insert(row)
    .select()
    .single();

  if (error) {
    log("error", "contact_create_failed", { error: error.message });
    const conflict = error.code === "23505";
    return NextResponse.json(
      { error: conflict ? "That phone number already exists." : error.message },
      { status: conflict ? 409 : 400 }
    );
  }

  await supabase.from("audit_logs").insert({
    owner_id: user.id,
    action: "contact.create",
    entity: "contact",
    entity_id: data.id,
  });

  return NextResponse.json({ contact: data });
}

// PATCH: update a contact (incl. manual opt-out toggle)
export async function PATCH(req: Request) {
  const { supabase, user } = await ctx();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (fields.phone) {
    const p = normalizePhone(fields.phone);
    if (!isValidE164(p))
      return NextResponse.json({ error: "Invalid phone" }, { status: 422 });
    fields.phone = p;
  }
  if (typeof fields.opt_out === "boolean") {
    fields.status = fields.opt_out ? "opt_out" : "active";
  }

  const { data, error } = await supabase
    .from("contacts")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("audit_logs").insert({
    owner_id: user.id,
    action: "contact.update",
    entity: "contact",
    entity_id: id,
    meta: fields,
  });

  return NextResponse.json({ contact: data });
}

// DELETE: remove a contact
export async function DELETE(req: Request) {
  const { supabase, user } = await ctx();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("audit_logs").insert({
    owner_id: user.id,
    action: "contact.delete",
    entity: "contact",
    entity_id: id,
  });

  return NextResponse.json({ ok: true });
}
