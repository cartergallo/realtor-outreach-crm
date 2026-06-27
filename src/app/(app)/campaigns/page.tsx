import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Badge, Card } from "@/components/ui";
import type { Campaign } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "neutral" | "good" | "warn" | "bad"> = {
  draft: "neutral",
  review: "warn",
  sending: "warn",
  sent: "good",
  archived: "neutral",
};

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (campaigns as Campaign[]) ?? [];

  return (
    <div>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted">
            Build a segment, draft with Claude, review, then send.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="rounded-lg bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clayd"
        >
          New campaign
        </Link>
      </header>

      {list.length === 0 ? (
        <Card className="p-10 text-center text-muted">
          No campaigns yet. Create your first one to start drafting messages.
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="flex items-center justify-between p-5 transition hover:border-clay">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-muted">
                    {c.offer ?? "No offer set"}
                    {c.community ? ` · ${c.community}` : ""}
                  </div>
                </div>
                <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>
                  {c.status}
                </Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
