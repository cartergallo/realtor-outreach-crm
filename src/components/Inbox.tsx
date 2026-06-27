"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Contact, Message } from "@/lib/types";
import { Badge } from "@/components/ui";

type Props = { messages: Message[]; contacts: Contact[] };

export default function Inbox({ messages, contacts }: Props) {
  const router = useRouter();
  const contactById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c])),
    [contacts]
  );

  // Group messages by contact, newest activity first.
  const threads = useMemo(() => {
    const map = new Map<string, Message[]>();
    for (const m of messages) {
      if (!m.contact_id) continue;
      const arr = map.get(m.contact_id) ?? [];
      arr.push(m);
      map.set(m.contact_id, arr);
    }
    return Array.from(map.entries())
      .map(([cid, msgs]) => ({
        contact: contactById.get(cid),
        messages: msgs,
        last: msgs[msgs.length - 1],
      }))
      .filter((t) => t.contact)
      .sort(
        (a, b) =>
          new Date(b.last.created_at).getTime() -
          new Date(a.last.created_at).getTime()
      );
  }, [messages, contactById]);

  const [activeId, setActiveId] = useState<string | null>(
    threads[0]?.contact?.id ?? null
  );
  const active = threads.find((t) => t.contact?.id === activeId);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localMsgs, setLocalMsgs] = useState<Message[]>([]);

  async function send() {
    if (!active?.contact || !draft.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/twilio/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: active.contact.id, body: draft }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Could not send.");
    // Optimistic append
    setLocalMsgs((prev) => [
      ...prev,
      {
        id: json.messageId ?? Math.random().toString(),
        owner_id: "",
        contact_id: active.contact!.id,
        campaign_id: null,
        direction: "outbound",
        body: draft,
        status: "sent",
        from_number: null,
        to_number: active.contact!.phone,
        twilio_sid: null,
        error: null,
        created_at: new Date().toISOString(),
      } as Message,
    ]);
    setDraft("");
    router.refresh();
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white p-10 text-center text-muted">
        No conversations yet. Once you send a campaign or receive a reply, it
        shows up here.
      </div>
    );
  }

  const threadMessages = active
    ? [...active.messages, ...localMsgs.filter((m) => m.contact_id === active.contact?.id)]
    : [];

  return (
    <div className="grid gap-4 md:grid-cols-[300px_1fr]">
      {/* Thread list */}
      <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-white scroll-thin">
        {threads.map((t) => {
          const c = t.contact!;
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`block w-full border-b border-line/60 px-4 py-3 text-left transition ${
                isActive ? "bg-paper" : "hover:bg-paper/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-medium">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                    c.phone}
                </span>
                {c.opt_out && <Badge tone="bad">Opt-out</Badge>}
              </div>
              <div className="truncate text-xs text-muted">
                {t.last.direction === "inbound" ? "↩ " : "→ "}
                {t.last.body}
              </div>
            </button>
          );
        })}
      </div>

      {/* Conversation */}
      <div className="flex max-h-[70vh] flex-col rounded-xl border border-line bg-white">
        {active && (
          <>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <div className="text-sm font-medium">
                  {[active.contact!.first_name, active.contact!.last_name]
                    .filter(Boolean)
                    .join(" ") || active.contact!.phone}
                </div>
                <div className="font-mono text-xs text-muted">
                  {active.contact!.phone}
                </div>
              </div>
              {active.contact!.opt_out && <Badge tone="bad">Opted out</Badge>}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4 scroll-thin">
              {threadMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.direction === "outbound" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.direction === "outbound"
                        ? "bg-clay text-white"
                        : "bg-paper text-ink"
                    }`}
                  >
                    <div>{m.body}</div>
                    <div
                      className={`mt-1 text-[10px] ${
                        m.direction === "outbound"
                          ? "text-white/70"
                          : "text-muted"
                      }`}
                    >
                      {new Date(m.created_at).toLocaleString()}
                      {m.status === "failed" && " · failed"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="border-t border-line p-3">
              {active.contact!.opt_out ? (
                <p className="text-center text-sm text-muted">
                  This contact has opted out. You can&apos;t message them.
                </p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={320}
                      rows={2}
                      placeholder="Type a reply…"
                      className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-clay"
                    />
                    <button
                      onClick={send}
                      disabled={busy || !draft.trim()}
                      className="rounded-lg bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clayd disabled:opacity-50"
                    >
                      {busy ? "Sending…" : "Send"}
                    </button>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted">
                    <span>{draft.length}/320</span>
                    {error && <span className="text-red-600">{error}</span>}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
