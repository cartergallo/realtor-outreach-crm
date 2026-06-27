import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

async function getStats() {
  const supabase = await createClient();

  const [contacts, optOuts, sent, replies] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("opt_out", true),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "outbound"),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "inbound"),
  ]);

  const sentCount = sent.count ?? 0;
  const replyCount = replies.count ?? 0;
  const replyRate =
    sentCount > 0 ? Math.round((replyCount / sentCount) * 1000) / 10 : 0;

  return {
    contacts: contacts.count ?? 0,
    optOuts: optOuts.count ?? 0,
    sent: sentCount,
    replies: replyCount,
    replyRate,
  };
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div
        className={`mt-2 font-display text-3xl ${
          accent ? "text-clay" : "text-ink"
        }`}
      >
        {value}
      </div>
    </Card>
  );
}

export default async function DashboardPage() {
  const s = await getStats();

  return (
    <div>
      <header className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted">
            Your outreach at a glance. Every send needs your approval.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/contacts/import"
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-paper"
          >
            Import contacts
          </Link>
          <Link
            href="/campaigns/new"
            className="rounded-lg bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clayd"
          >
            New campaign
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Stat label="Contacts" value={s.contacts} />
        <Stat label="Messages sent" value={s.sent} />
        <Stat label="Replies" value={s.replies} />
        <Stat label="Reply rate" value={`${s.replyRate}%`} accent />
        <Stat label="Opt-outs" value={s.optOuts} />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-xl">Start here</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted">
            <li>1. Import a CSV of realtor contacts.</li>
            <li>2. Tag and segment them.</li>
            <li>3. Build a campaign and let Claude draft each message.</li>
            <li>4. Review every draft, then send through your Twilio number.</li>
            <li>5. Replies land in your inbox; opt-outs are handled automatically.</li>
          </ol>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-xl">Compliance, built in</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>· No message sends without your explicit approval.</li>
            <li>· Opt-out contacts are never messaged.</li>
            <li>· STOP / UNSUBSCRIBE and friends opt people out instantly.</li>
            <li>· Every inbound and outbound message is stored.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
