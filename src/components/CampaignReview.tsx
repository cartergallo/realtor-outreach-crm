"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Campaign, CampaignRecipient, Contact } from "@/lib/types";
import { Badge, Button, Card } from "@/components/ui";

type Props = {
  campaign: Campaign;
  initialRecipients: CampaignRecipient[];
  contacts: Contact[];
};

const STATUS_TONE: Record<string, "neutral" | "good" | "warn" | "bad"> = {
  pending: "neutral",
  drafted: "warn",
  approved: "good",
  sent: "good",
  skipped: "neutral",
  failed: "bad",
};

export default function CampaignReview({
  campaign,
  initialRecipients,
  contacts,
}: Props) {
  const router = useRouter();
  const [recipients, setRecipients] = useState(initialRecipients);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const contactById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c])),
    [contacts]
  );

  const counts = useMemo(() => {
    const c = { drafted: 0, approved: 0, sent: 0, skipped: 0, failed: 0, pending: 0 };
    recipients.forEach((r) => {
      (c as Record<string, number>)[r.status] =
        ((c as Record<string, number>)[r.status] ?? 0) + 1;
    });
    return c;
  }, [recipients]);

  async function generate(regenerate = false) {
    setBusy("generate");
    setError(null);
    const res = await fetch("/api/campaigns/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id, regenerate }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) return setError(json.error ?? "Drafting failed.");
    setToast(`Drafted ${json.drafted} message(s).`);
    router.refresh();
  }

  async function updateRecipient(
    id: string,
    patch: Partial<Pick<CampaignRecipient, "draft_body" | "status">>
  ) {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
    await fetch("/api/campaigns/recipients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
  }

  async function bulk(action: "approve_all" | "skip_all") {
    setBusy(action);
    await fetch("/api/campaigns/recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id, action }),
    });
    setBusy(null);
    router.refresh();
  }

  async function send() {
    if (
      !confirm(
        `Send ${counts.approved} approved message(s)? Opt-outs are skipped automatically.`
      )
    )
      return;
    setBusy("send");
    setError(null);
    const res = await fetch("/api/twilio/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) return setError(json.error ?? "Send failed.");
    setToast(`Sent ${json.sent}, skipped ${json.skipped}, failed ${json.failed}.`);
    router.refresh();
  }

  const hasDrafts = recipients.some((r) => r.draft_body);

  return (
    <div className="mt-2">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-muted">
            {campaign.offer ?? "No offer"} ·{" "}
            {recipients.length} recipients · status: {campaign.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!hasDrafts ? (
            <Button onClick={() => generate(false)} disabled={busy === "generate"}>
              {busy === "generate" ? "Drafting…" : "Generate drafts with Claude"}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => generate(true)}
                disabled={busy === "generate"}
              >
                {busy === "generate" ? "Regenerating…" : "Regenerate all"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => bulk("approve_all")}
                disabled={!!busy}
              >
                Approve all drafts
              </Button>
              <Button onClick={send} disabled={busy === "send" || counts.approved === 0}>
                {busy === "send"
                  ? "Sending…"
                  : `Send ${counts.approved} approved`}
              </Button>
            </>
          )}
        </div>
      </header>

      {toast && (
        <p className="mb-4 rounded-lg bg-moss/10 px-4 py-2 text-sm text-moss">
          {toast}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Summary chips */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {Object.entries(counts).map(([k, v]) =>
          v > 0 ? (
            <Badge key={k} tone={STATUS_TONE[k]}>
              {v} {k}
            </Badge>
          ) : null
        )}
      </div>

      {recipients.length === 0 && (
        <Card className="p-10 text-center text-muted">
          No recipients matched this segment. Edit the segment or add contacts.
        </Card>
      )}

      <div className="space-y-3">
        {recipients.map((r) => {
          const c = contactById.get(r.contact_id);
          const optedOut = c?.opt_out;
          return (
            <Card key={r.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">
                    {[c?.first_name, c?.last_name].filter(Boolean).join(" ") ||
                      c?.phone}
                  </span>
                  <span className="ml-2 font-mono text-xs text-muted">
                    {c?.phone}
                  </span>
                  {c?.brokerage && (
                    <span className="ml-2 text-xs text-muted">
                      · {c.brokerage}
                    </span>
                  )}
                </div>
                {optedOut ? (
                  <Badge tone="bad">Opted out</Badge>
                ) : (
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                )}
              </div>

              {optedOut ? (
                <p className="text-sm text-muted">
                  This contact opted out and will not be messaged.
                </p>
              ) : r.draft_body ? (
                <>
                  <textarea
                    value={r.draft_body}
                    maxLength={320}
                    onChange={(e) =>
                      setRecipients((prev) =>
                        prev.map((x) =>
                          x.id === r.id
                            ? { ...x, draft_body: e.target.value }
                            : x
                        )
                      )
                    }
                    onBlur={(e) =>
                      updateRecipient(r.id, { draft_body: e.target.value })
                    }
                    disabled={r.status === "sent"}
                    rows={2}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-clay"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-muted">
                      {r.draft_body.length}/320
                    </span>
                    {r.status !== "sent" && (
                      <div className="flex gap-2">
                        {r.status !== "approved" ? (
                          <button
                            onClick={() =>
                              updateRecipient(r.id, { status: "approved" })
                            }
                            className="text-xs font-medium text-moss hover:underline"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              updateRecipient(r.id, { status: "drafted" })
                            }
                            className="text-xs text-muted hover:underline"
                          >
                            Unapprove
                          </button>
                        )}
                        <button
                          onClick={() =>
                            updateRecipient(r.id, { status: "skipped" })
                          }
                          className="text-xs text-muted hover:underline"
                        >
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">
                  No draft yet. Use “Generate drafts”.
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
