// Phone normalization to E.164 (US default). No external deps.
export function normalizePhone(raw: string, defaultCountry = "1"): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    const rest = digits.slice(1).replace(/\D/g, "");
    return rest.length >= 8 ? "+" + rest : null;
  }
  digits = digits.replace(/\D/g, "");
  if (digits.length === 10) return "+" + defaultCountry + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (digits.length >= 8) return "+" + digits;
  return null;
}

export function isValidE164(p: string | null): boolean {
  return !!p && /^\+\d{8,15}$/.test(p);
}
