"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg("Check your email for a sign-in link.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-4xl tracking-tight text-paper">
            Outreach
          </div>
          <p className="mt-1 text-sm text-paper/60">
            Realtor SMS, one rep, fully in your hands.
          </p>
        </div>

        <form
          onSubmit={mode === "password" ? handlePassword : handleMagic}
          className="rounded-2xl border border-white/10 bg-white p-6 shadow-xl"
        >
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-clay"
            placeholder="you@brokerage.com"
          />

          {mode === "password" && (
            <>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-4 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-clay"
                placeholder="••••••••"
              />
            </>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-clay px-4 py-2.5 text-sm font-medium text-white transition hover:bg-clayd disabled:opacity-50"
          >
            {busy
              ? "Working…"
              : mode === "password"
              ? "Sign in"
              : "Send magic link"}
          </button>

          <button
            type="button"
            onClick={() =>
              setMode((m) => (m === "password" ? "magic" : "password"))
            }
            className="mt-3 w-full text-center text-xs text-muted hover:text-ink"
          >
            {mode === "password"
              ? "Use a magic link instead"
              : "Use email + password"}
          </button>

          {msg && (
            <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-center text-xs text-ink">
              {msg}
            </p>
          )}
        </form>
        <p className="mt-4 text-center text-xs text-paper/40">
          Private app. Accounts are provisioned by the owner.
        </p>
      </div>
    </div>
  );
}
