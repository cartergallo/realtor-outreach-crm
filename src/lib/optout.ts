// Carrier-standard opt-out keywords. Inbound match => opt_out=true.
export const OPT_OUT_KEYWORDS = [
  "STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT",
];
export const OPT_IN_KEYWORDS = ["START", "YES", "UNSTOP"];

export function isOptOut(body: string): boolean {
  const w = (body || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  return OPT_OUT_KEYWORDS.includes(w);
}
export function isOptIn(body: string): boolean {
  const w = (body || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  return OPT_IN_KEYWORDS.includes(w);
}
