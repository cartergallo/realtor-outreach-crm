import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// PATCH { id, draft_body?, status? }  — edit/approve/skip a single recipient.
// POST  { campaignId, action:'approve_all'|'skip_all' } — bulk.
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, draft_body, status } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof draft_body === "string") update.draft_body = draft_body.slice(0, 320);
  if (status) update.status = status;

  const { data, error } = await supabase
    .from("campaign_recipients")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ recipient: data });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId, action } = await req.json();
  if (!campaignId || !action)
    return NextResponse.json({ error: "Missing params" }, { status: 400 });

  if (action === "approve_all") {
    const { error } = await supabase
      .from("campaign_recipients")
      .update({ status: "approved" })
      .eq("campaign_id", campaignId)
      .eq("status", "drafted");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (action === "skip_all") {
    const { error } = await supabase
      .from("campaign_recipients")
      .update({ status: "skipped" })
      .eq("campaign_id", campaignId)
      .in("status", ["drafted", "approved", "pending"]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
