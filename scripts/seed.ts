/**
 * Seed script. Run with: npm run seed
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Optional: SEED_EMAIL, SEED_PASSWORD (defaults below).
 *
 * Creates (idempotently):
 *  - a demo auth user (confirmed)
 *  - profile with business + Twilio number
 *  - a few tags
 *  - sample contacts (incl. one opted-out, to prove the guard)
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const EMAIL = process.env.SEED_EMAIL || "demo@alago.test";
const PASSWORD = process.env.SEED_PASSWORD || "DemoPass123!";

const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  // 1) Create or fetch the demo user.
  let userId: string;
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });

  if (createErr && !/already/i.test(createErr.message)) {
    throw createErr;
  }
  if (created?.user) {
    userId = created.user.id;
    console.log("Created user:", EMAIL);
  } else {
    const { data: list } = await sb.auth.admin.listUsers();
    const found = list.users.find((u) => u.email === EMAIL);
    if (!found) throw new Error("Could not create or find demo user.");
    userId = found.id;
    console.log("Using existing user:", EMAIL);
  }

  // 2) Profile (trigger creates an empty one; fill it in).
  await sb.from("profiles").upsert({
    id: userId,
    business_name: "Alago Junk Removal",
    rep_name: "Carter",
    rep_signature: "— Carter, Alago",
    twilio_from_number: process.env.TWILIO_FROM_NUMBER || "+17045551234",
  });

  // 3) Tags
  const tagNames = ["Hot lead", "Realtor", "Investor", "Past client"];
  const { data: tags } = await sb
    .from("tags")
    .upsert(
      tagNames.map((name) => ({ owner_id: userId, name })),
      { onConflict: "owner_id,name" }
    )
    .select();
  console.log("Tags:", tags?.length);

  // 4) Contacts
  const contacts = [
    { first_name: "Jordan", last_name: "Pierce", phone: "+17045550142", brokerage: "Keller Williams", community: "Ballantyne" },
    { first_name: "Mara", last_name: "Nguyen", phone: "+17045550188", brokerage: "CLT Realty", community: "Dilworth" },
    { first_name: "Devon", last_name: "Hill", phone: "+17045550173", brokerage: "Compass", community: "South End" },
    { first_name: "Priya", last_name: "Shah", phone: "+17045550199", brokerage: "RE/MAX", community: "University City" },
    { first_name: "Carlos", last_name: "Mendez", phone: "+17045550121", brokerage: "eXp Realty", community: "NoDa" },
    // Opted-out contact to demonstrate the send guard:
    { first_name: "Optout", last_name: "Example", phone: "+17045550000", brokerage: "Test", community: "Test", opt_out: true, status: "opt_out" as const },
  ];

  const { data: inserted, error: cErr } = await sb
    .from("contacts")
    .upsert(
      contacts.map((c) => ({ ...c, owner_id: userId })),
      { onConflict: "owner_id,phone" }
    )
    .select();
  if (cErr) throw cErr;
  console.log("Contacts:", inserted?.length);

  // 5) Tag a couple of contacts as "Hot lead" + "Realtor"
  const hot = tags?.find((t) => t.name === "Hot lead");
  const realtor = tags?.find((t) => t.name === "Realtor");
  const jordan = inserted?.find((c) => c.first_name === "Jordan");
  const mara = inserted?.find((c) => c.first_name === "Mara");
  const links = [];
  if (hot && jordan) links.push({ owner_id: userId, contact_id: jordan.id, tag_id: hot.id });
  if (realtor && jordan) links.push({ owner_id: userId, contact_id: jordan.id, tag_id: realtor.id });
  if (realtor && mara) links.push({ owner_id: userId, contact_id: mara.id, tag_id: realtor.id });
  if (links.length) {
    await sb.from("contact_tags").upsert(links, { onConflict: "contact_id,tag_id" });
  }

  console.log("\nSeed complete.");
  console.log(`Login at /login with:\n  email: ${EMAIL}\n  password: ${PASSWORD}`);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
