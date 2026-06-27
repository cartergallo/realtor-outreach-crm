import { NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase-server";
import { normalizePhone, isValidE164 } from "@/lib/phone";
import { log } from "@/lib/logger";

// Accepts JSON: { rows: Array<Record<string,string>> } already parsed client-side,
// OR raw CSV text: { csv: string }. Returns import summary.
type Incoming = { rows?: Record<string, string>[]; csv?: string };

const FIELD_ALIASES: Record<string, string> = {
  "first name": "first_name",
  first: "first_name",
  firstname: "first_name",
  "last name": "last_name",
  last: "last_name",
  lastname: "last_name",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  cell: "phone",
  email: "email",
  "e-mail": "email",
  brokerage: "brokerage",
  company: "brokerage",
  office: "brokerage",
  community: "community",
  neighborhood: "community",
  notes: "notes",
};

function mapRow(raw: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = FIELD_ALIASES[k.trim().toLowerCase()];
    if (key) out[key] = (v ?? "").toString().trim();
  }
  return out;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: Incoming;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let rows: Record<string, string>[] = [];
  if (payload.csv) {
    const parsed = Papa.parse<Record<string, string>>(payload.csv, {
      header: true,
      skipEmptyLines: true,
    });
    rows = parsed.data;
  } else if (Array.isArray(payload.rows)) {
    rows = payload.rows;
  } else {
    return NextResponse.json({ error: "No rows provided." }, { status: 400 });
  }

  if (rows.length === 0)
    return NextResponse.json({ error: "CSV had no data rows." }, { status: 422 });
  if (rows.length > 5000)
    return NextResponse.json(
      { error: "Max 5000 rows per import." },
      { status: 422 }
    );

  const valid: Record<string, string | null>[] = [];
  const errors: { row: number; reason: string }[] = [];
  const seen = new Set<string>();

  rows.forEach((raw, i) => {
    const m = mapRow(raw);
    const phone = normalizePhone(m.phone ?? "");
    if (!isValidE164(phone)) {
      errors.push({ row: i + 2, reason: "Invalid or missing phone" });
      return;
    }
    if (seen.has(phone!)) {
      errors.push({ row: i + 2, reason: "Duplicate phone in file" });
      return;
    }
    seen.add(phone!);
    valid.push({
      owner_id: user.id,
      first_name: m.first_name || null,
      last_name: m.last_name || null,
      phone: phone!,
      email: m.email || null,
      brokerage: m.brokerage || null,
      community: m.community || null,
      notes: m.notes || null,
    });
  });

  let inserted = 0;
  if (valid.length > 0) {
    // Upsert on (owner_id, phone): updates existing, inserts new. Preserves opt_out.
    const { data, error } = await supabase
      .from("contacts")
      .upsert(valid, {
        onConflict: "owner_id,phone",
        ignoreDuplicates: false,
      })
      .select("id");
    if (error) {
      log("error", "csv_import_failed", { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    inserted = data?.length ?? 0;
  }

  await supabase.from("audit_logs").insert({
    owner_id: user.id,
    action: "contacts.import",
    entity: "contact",
    meta: { received: rows.length, upserted: inserted, errors: errors.length },
  });

  return NextResponse.json({
    received: rows.length,
    upserted: inserted,
    skipped: errors.length,
    errors: errors.slice(0, 50),
  });
}
