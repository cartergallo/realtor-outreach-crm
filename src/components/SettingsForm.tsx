"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

export default function SettingsForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(profile?.business_name ?? "");
  const [repName, setRepName] = useState(profile?.rep_name ?? "");
  const [fromNumber, setFromNumber] = useState(
    profile?.twilio_from_number ?? ""
  );
  const [signature, setSignature] = useState(profile?.rep_signature ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: businessName,
        rep_name: repName,
        twilio_from_number: fromNumber,
        rep_signature: signature,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok)
      return setMsg({ kind: "err", text: json.error ?? "Could not save." });
    setMsg({ kind: "ok", text: "Settings saved." });
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl tracking-tight">Settings</h1>
      <p className="mb-6 text-sm text-muted">
        Your business identity and the Twilio number messages send from.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg">Business</h2>
          <div className="space-y-4">
            <div>
              <Label>Business name</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Alago Junk Removal"
              />
            </div>
            <div>
              <Label>Your name (rep)</Label>
              <Input
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder="Carter"
              />
            </div>
            <div>
              <Label>Signature (optional)</Label>
              <Textarea
                rows={2}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="— Carter, Alago"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg">Twilio</h2>
          <div className="space-y-4">
            <div>
              <Label>Sending number (E.164)</Label>
              <Input
                value={fromNumber}
                onChange={(e) => setFromNumber(e.target.value)}
                placeholder="+17045551234"
              />
              <p className="mt-1 text-xs text-muted">
                This must be a number you own in Twilio. Inbound replies to this
                number land in your inbox.
              </p>
            </div>
            <div className="rounded-lg bg-paper p-3 text-xs text-muted">
              Account SID and auth token are set as environment variables, never
              entered here.
            </div>
          </div>
        </Card>
      </div>

      {msg && (
        <p
          className={`mt-4 rounded-lg px-4 py-2 text-sm ${
            msg.kind === "ok"
              ? "bg-moss/10 text-moss"
              : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
