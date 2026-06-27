import Anthropic from "@anthropic-ai/sdk";
import type { Contact, Campaign, Profile } from "@/lib/types";
import { log } from "@/lib/logger";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");
  return new Anthropic({ apiKey: key });
}

// Fill a simple {{placeholder}} template as a deterministic fallback.
export function fillTemplate(
  template: string,
  contact: Contact,
  campaign: Campaign,
  profile: Profile | null
): string {
  const map: Record<string, string> = {
    first_name: contact.first_name ?? "there",
    last_name: contact.last_name ?? "",
    brokerage: contact.brokerage ?? "your brokerage",
    community: contact.community ?? campaign.community ?? "the area",
    offer: campaign.offer ?? "",
    rep_name: profile?.rep_name ?? "",
    business_name: profile?.business_name ?? "",
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => map[k] ?? "");
}

const SYSTEM = `You write short, friendly, compliant SMS messages for a real-estate outreach rep.
Rules:
- 1 to 2 sentences, under 320 characters total.
- Plain text only. No emojis unless the template uses them.
- Personalize using the contact's name, brokerage, or community when natural.
- Never claim to be iMessage, never mention blue bubbles, never imply this is a personal text from a friend.
- Include a soft call to action. Do NOT invent facts about the recipient.
- End with the rep's name if provided.
- Output ONLY the message text, no quotes, no preamble.`;

export async function draftMessage(
  contact: Contact,
  campaign: Campaign,
  profile: Profile | null
): Promise<{ body: string; source: "claude" | "template" }> {
  const fallback = campaign.template
    ? fillTemplate(campaign.template, contact, campaign, profile)
    : `Hi ${contact.first_name ?? "there"}, ${
        campaign.offer ?? "reaching out from " + (profile?.business_name ?? "our team")
      }.`;

  try {
    const prompt = [
      `Rep: ${profile?.rep_name ?? "the rep"} at ${
        profile?.business_name ?? "a local business"
      }.`,
      `Campaign offer: ${campaign.offer ?? "(none)"}.`,
      `Community focus: ${campaign.community ?? "(none)"}.`,
      `Base template (optional): ${campaign.template ?? "(none)"}.`,
      ``,
      `Contact:`,
      `- Name: ${[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "(unknown)"}`,
      `- Brokerage: ${contact.brokerage ?? "(unknown)"}`,
      `- Community: ${contact.community ?? "(unknown)"}`,
      ``,
      `Write the SMS now.`,
    ].join("\n");

    const res = await client().messages.create({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    if (!text) return { body: fallback, source: "template" };
    return { body: text.slice(0, 320), source: "claude" };
  } catch (e) {
    log("warn", "claude_draft_failed", {
      contact: contact.id,
      error: (e as Error).message,
    });
    return { body: fallback, source: "template" };
  }
}
