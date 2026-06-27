"use client";

import { useState } from "react";

// Keep this wording identical to CONSENT_TEXT in /api/optin/route.ts —
// it is the legal record of what the person agreed to.
const CONSENT_TEXT =
  "I agree to receive recurring marketing text messages from Alago about Lennar Houston offers and scheduling. Msg & data rates may apply. Reply STOP to opt out at any time.";

export default function OffersPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    brokerage: "",
  });
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Please check the box to agree to receive texts.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/optin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, consent, company_website: hp }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Something went wrong.");
    setDone(true);
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-5">
        <div className="w-full max-w-md text-center">
          <div className="mb-3 text-5xl">✓</div>
          <h1 className="font-display text-3xl text-paper">You&apos;re on the list</h1>
          <p className="mt-3 text-paper/70">
            We&apos;ll text you when new Lennar Houston offers drop. Reply STOP
            anytime to opt out.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-12 text-paper">
      <div className="mx-auto max-w-md">
        {/* Hero */}
        <div className="mb-8">
          <div className="mb-2 inline-block rounded-full border border-clay/40 bg-clay/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-clay">
            For Houston realtors
          </div>
          <h1 className="font-display text-4xl leading-tight tracking-tight">
            Get Lennar Houston offers by text, the moment they drop.
          </h1>
          <p className="mt-4 text-paper/70">
            {/* PLACEHOLDER — replace with Kenzie's real offer details */}
            [Offer details go here — e.g. current incentives, eligible
            communities, agent commission specifics.] Be the first to know so
            you can move your buyers fast.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={submit}
          className="rounded-2xl border border-white/10 bg-white p-6 text-ink"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                First name
              </label>
              <input
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-clay"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                Last name
              </label>
              <input
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-clay"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
              Mobile number *
            </label>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(704) 555-0142"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-clay"
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-clay"
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
              Brokerage
            </label>
            <input
              value={form.brokerage}
              onChange={(e) => set("brokerage", e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-clay"
            />
          </div>

          {/* Honeypot: hidden from humans, bots tend to fill it */}
          <input
            tabIndex={-1}
            autoComplete="off"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            name="company_website"
            className="hidden"
            aria-hidden="true"
          />

          {/* Consent — the legal core */}
          <label className="mt-4 flex gap-3 text-xs leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span>{CONSENT_TEXT}</span>
          </label>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-clay px-4 py-3 text-sm font-medium text-white transition hover:bg-clayd disabled:opacity-50"
          >
            {busy ? "Signing you up…" : "Send me the offers"}
          </button>

          <p className="mt-3 text-center text-[11px] text-muted">
            We only text about offers and scheduling. No spam. Opt out anytime
            with STOP.
          </p>
        </form>
      </div>
    </main>
  );
}
