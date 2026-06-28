"use client";

import { useState } from "react";

// Keep this wording identical to CONSENT_TEXT in /api/optin/route.ts —
// it is the legal record of what the person agreed to.
const CONSENT_TEXT =
  "I agree to receive recurring marketing text messages from Alago about Lennar Houston offers and scheduling. Msg & data rates may apply. Reply STOP to opt out at any time.";

const VALUE_PROPS = [
  {
    title: "Full agent commission",
    body: "Co-op paid on every closing, plus builder bonuses on select homes.",
  },
  {
    title: "First access to new releases",
    body: "New incentives and quick move-in homes before they go public.",
  },
  {
    title: "No noise, no spam",
    body: "Texts only when there's something worth knowing. Reply STOP anytime.",
  },
];

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
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-moss text-2xl text-white">
            ✓
          </div>
          <h1 className="font-display text-3xl text-paper">You&apos;re on the list</h1>
          <p className="mt-3 leading-relaxed text-paper/70">
            We&apos;ll text you when new Lennar Houston offers drop. Reply STOP
            anytime to opt out.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      {/* Top bar */}
      <header className="flex items-center justify-between bg-ink px-5 py-3.5 md:px-8">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-paper">ALAGO</span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-paper/50">
            Houston
          </span>
        </div>
        <span className="text-xs text-paper/50">For real estate agents</span>
      </header>

      <div className="grid md:grid-cols-[1.1fr_1fr]">
        {/* Left — pitch */}
        <section className="px-6 py-10 md:px-10 md:py-12">
          <div className="mb-6 inline-block rounded-full bg-clay/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-clayd">
            New construction · Houston
          </div>

          <h1 className="font-display text-3xl font-bold leading-[1.14] tracking-tight text-ink md:text-[34px]">
            New Lennar Houston offers, texted to you first.
          </h1>

          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
            Quick move-in homes, builder incentives, and new releases across
            Houston communities like Sila in Huffman. Be the first to know so you
            can place your buyers fast and earn your full commission.
          </p>

          {/*
            HERO IMAGE PLACEHOLDER
            Replace the <div> below with your own photo or a licensed stock image:
              <img
                src="/hero-home.jpg"
                alt="New construction home in Houston"
                className="mt-7 h-52 w-full rounded-xl object-cover border border-line"
              />
            Put the image file in the project's /public folder (e.g. public/hero-home.jpg).
            Do NOT use Lennar's own renderings unless Kenzie confirms you have rights.
          */}
          <div className="mt-7 flex h-52 w-full items-center justify-center rounded-xl border border-dashed border-line bg-line/30 text-center">
            <div className="px-4">
              <div className="text-2xl text-muted/60">🏠</div>
              <div className="mt-1 text-xs font-medium text-muted">
                Home photo goes here
              </div>
              <div className="text-[11px] text-muted/70">
                Add your own or a licensed image
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-5 border-t border-line pt-7">
            {VALUE_PROPS.map((v) => (
              <div key={v.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-line/60 text-lg text-clay">
                  ◆
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-ink">
                    {v.title}
                  </div>
                  <div className="text-sm leading-snug text-muted">{v.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right — form */}
        <section className="flex flex-col justify-center border-t border-line bg-white px-6 py-10 md:border-l md:border-t-0 md:px-8 md:py-12">
          <h2 className="text-lg font-bold tracking-tight text-ink">
            Get the offers by text
          </h2>
          <p className="mb-5 text-sm text-muted">Free for agents. Takes 20 seconds.</p>

          <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <input
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Last name">
                <input
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <div className="mt-2.5">
              <Field label="Mobile number">
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(713) 555-0142"
                  className="input"
                />
              </Field>
            </div>

            <div className="mt-2.5">
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <div className="mt-2.5">
              <Field label="Brokerage">
                <input
                  value={form.brokerage}
                  onChange={(e) => set("brokerage", e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            {/* Honeypot */}
            <input
              tabIndex={-1}
              autoComplete="off"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              name="company_website"
              className="hidden"
              aria-hidden="true"
            />

            <label className="mt-4 flex gap-2.5 text-[11px] leading-relaxed text-muted">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 shrink-0 accent-clay"
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
              className="mt-4 w-full rounded-lg bg-clay px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-clayd disabled:opacity-50"
            >
              {busy ? "Signing you up…" : "Send me the offers"}
            </button>
            <p className="mt-3 text-center text-[11px] text-muted">
              No spam. Opt out anytime.
            </p>
          </form>
        </section>
      </div>

      {/* Bottom stat strip */}
      <footer className="flex flex-wrap items-center justify-center gap-x-9 gap-y-2 border-t border-line bg-line/30 px-6 py-4 text-xs text-muted">
        <span>
          <span className="font-semibold text-ink">Full</span> agent co-op
        </span>
        <span>
          <span className="font-semibold text-ink">Quick</span> move-in inventory
        </span>
        <span>
          <span className="font-semibold text-ink">Houston</span> metro communities
        </span>
      </footer>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}
