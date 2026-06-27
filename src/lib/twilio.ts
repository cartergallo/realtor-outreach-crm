// Twilio REST send via fetch (no SDK needed). Server-only.
import { log } from "@/lib/logger";

export type SendResult =
  | { ok: true; sid: string }
  | { ok: false; error: string };

export async function sendSms(opts: {
  to: string;
  from: string;
  body: string;
}): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token)
    return { ok: false, error: "Twilio credentials are not configured." };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({
    To: opts.to,
    From: opts.from,
    Body: opts.body,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      log("error", "twilio_send_failed", { status: res.status, msg: data?.message });
      return { ok: false, error: data?.message ?? "Twilio send failed." };
    }
    return { ok: true, sid: data.sid };
  } catch (e) {
    log("error", "twilio_send_exception", { error: (e as Error).message });
    return { ok: false, error: (e as Error).message };
  }
}
