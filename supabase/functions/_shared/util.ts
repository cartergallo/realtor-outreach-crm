// Shared helpers for Supabase Edge Functions (Deno runtime).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function admin() {
  return createClient(
    Deno.env.get("SB_URL")!,
    Deno.env.get("SB_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

export const OPT_OUT = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
export const OPT_IN = ["START", "YES", "UNSTOP"];

export function word(body: string) {
  return (body || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
}

export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) {
    const rest = d.slice(1).replace(/\D/g, "");
    return rest.length >= 8 ? "+" + rest : null;
  }
  d = d.replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  if (d.length >= 8) return "+" + d;
  return null;
}

// Twilio signature validation (HMAC-SHA1).
export async function validTwilioSignature(
  token: string,
  signature: string | null,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  if (!signature) return false;
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expected === signature;
}

export function twiml(message?: string | null): Response {
  const inner = message
    ? `<Message>${message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</Message>`
    : "";
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}
