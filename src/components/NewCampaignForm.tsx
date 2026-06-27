"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Tag } from "@/lib/types";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

export default function NewCampaignForm({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [offer, setOffer] = useState("");
  const [community, setCommunity] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [template, setTemplate] = useState(
    "Hi {{first_name}}, this is {{rep_name}} with {{business_name}}. {{offer}} Would you be open to a quick chat?"
  );
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        offer,
        community,
        template,
        segment: {
          tag_ids: tagIds,
          brokerage: brokerage || undefined,
          community: community || undefined,
        },
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Could not create campaign.");
    router.push(`/campaigns/${json.campaign.id}`);
  }

  return (
    <div>
      <Link href="/campaigns" className="text-sm text-muted hover:text-ink">
        ← Back to campaigns
      </Link>
      <h1 className="mt-2 font-display text-3xl tracking-tight">New campaign</h1>
      <p className="mb-6 text-sm text-muted">
        Define who it reaches and what it offers. Drafts are generated next —
        nothing sends until you approve.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg">Basics</h2>
          <div className="space-y-4">
            <div>
              <Label>Campaign name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Spring listing outreach"
              />
            </div>
            <div>
              <Label>Offer</Label>
              <Input
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder="Free home valuation for your sellers"
              />
            </div>
            <div>
              <Label>Community focus (optional)</Label>
              <Input
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                placeholder="Ballantyne"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg">Segment</h2>
          <p className="mb-3 text-xs text-muted">
            Only active, non-opted-out contacts are included.
          </p>
          <div className="space-y-4">
            <div>
              <Label>Brokerage contains</Label>
              <Input
                value={brokerage}
                onChange={(e) => setBrokerage(e.target.value)}
                placeholder="Keller Williams"
              />
            </div>
            <div>
              <Label>Tags (any selected)</Label>
              {tags.length === 0 ? (
                <p className="text-xs text-muted">
                  No tags yet. You can still target by brokerage or community.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.id)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        tagIds.includes(t.id)
                          ? "border-clay bg-clay text-white"
                          : "border-line bg-white text-muted"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="mb-2 font-display text-lg">Message template</h2>
        <p className="mb-3 text-xs text-muted">
          Claude personalizes each message, using this as guidance. Placeholders:{" "}
          <span className="font-mono">
            {"{{first_name}} {{brokerage}} {{community}} {{offer}} {{rep_name}} {{business_name}}"}
          </span>
        </p>
        <Textarea
          rows={4}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
      </Card>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={create} disabled={busy || !name.trim()}>
          {busy ? "Creating…" : "Create & build recipients"}
        </Button>
      </div>
    </div>
  );
}
