import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import ContactsTable from "@/components/ContactsTable";
import type { Contact, Tag } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = await createClient();

  const [{ data: contacts }, { data: tags }, { data: contactTags }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("tags").select("*").order("name"),
      supabase.from("contact_tags").select("contact_id, tag_id"),
    ]);

  return (
    <div>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Contacts</h1>
          <p className="text-sm text-muted">
            {contacts?.length ?? 0} total. Filter by tag, brokerage, or community.
          </p>
        </div>
        <Link
          href="/contacts/import"
          className="rounded-lg bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clayd"
        >
          Import CSV
        </Link>
      </header>

      <ContactsTable
        initialContacts={(contacts as Contact[]) ?? []}
        tags={(tags as Tag[]) ?? []}
        contactTags={(contactTags as { contact_id: string; tag_id: string }[]) ?? []}
      />
    </div>
  );
}
