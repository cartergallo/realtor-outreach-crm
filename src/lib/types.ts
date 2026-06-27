// Hand-written DB types (subset). Regenerate with `supabase gen types` if desired.

export type ContactStatus = "active" | "opt_out";
export type MessageDirection = "outbound" | "inbound";
export type MessageStatus =
  | "draft" | "queued" | "sent" | "delivered" | "failed" | "received";
export type CampaignStatus = "draft" | "review" | "sending" | "sent" | "archived";
export type RecipientStatus =
  | "pending" | "drafted" | "approved" | "sent" | "skipped" | "failed";

export interface Profile {
  id: string;
  business_name: string | null;
  twilio_from_number: string | null;
  rep_name: string | null;
  rep_signature: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  owner_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  email: string | null;
  brokerage: string | null;
  community: string | null;
  notes: string | null;
  status: ContactStatus;
  opt_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  owner_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  owner_id: string;
  name: string;
  offer: string | null;
  community: string | null;
  template: string | null;
  segment: Record<string, unknown>;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  owner_id: string;
  campaign_id: string;
  contact_id: string;
  draft_body: string | null;
  status: RecipientStatus;
  sent_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  owner_id: string;
  contact_id: string | null;
  campaign_id: string | null;
  direction: MessageDirection;
  body: string;
  status: MessageStatus;
  from_number: string | null;
  to_number: string | null;
  twilio_sid: string | null;
  error: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  owner_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}
