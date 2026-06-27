import { createClient } from "@/lib/supabase-server";
import Inbox from "@/components/Inbox";
import type { Contact, Message } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const supabase = await createClient();

  // Pull recent messages and the contacts they belong to.
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(2000);

  const contactIds = Array.from(
    new Set((messages ?? []).map((m) => m.contact_id).filter(Boolean))
  ) as string[];

  const { data: contacts } = contactIds.length
    ? await supabase.from("contacts").select("*").in("id", contactIds)
    : { data: [] as Contact[] };

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl tracking-tight">Inbox</h1>
      <p className="mb-6 text-sm text-muted">
        Conversations with your contacts. Replies send through your Twilio
        number. Opted-out contacts can&apos;t be messaged.
      </p>
      <Inbox
        messages={(messages as Message[]) ?? []}
        contacts={(contacts as Contact[]) ?? []}
      />
    </div>
  );
}
