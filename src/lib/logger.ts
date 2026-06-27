// Minimal structured logger. Replace with a hosted sink later.
type Level = "info" | "warn" | "error";
export function log(level: Level, msg: string, meta: Record<string, unknown> = {}) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...meta });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
