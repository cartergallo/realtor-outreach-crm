"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Contact, Tag } from "@/lib/types";
import { Badge, Button, Input } from "@/components/ui";

type Props = {
  initialContacts: Contact[];
  tags: Tag[];
  contactTags: { contact_id: string; tag_id: string }[];
};

const EMPTY = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  brokerage: "",
  community: "",
  notes: "",
};

export default function ContactsTable({
  initialContacts,
  tags,
  contactTags,
}: Props) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [showOptOut, setShowOptOut] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tagsByContact = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const ct of contactTags) {
      const arr = m.get(ct.contact_id) ?? [];
      arr.push(ct.tag_id);
      m.set(ct.contact_id, arr);
    }
    return m;
  }, [contactTags]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (!showOptOut && c.opt_out) return false;
      if (tagFilter && !(tagsByContact.get(c.id) ?? []).includes(tagFilter))
        return false;
      if (q) {
        const hay = `${c.first_name ?? ""} ${c.last_name ?? ""} ${c.phone} ${
          c.email ?? ""
        } ${c.brokerage ?? ""} ${c.community ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [contacts, q, tagFilter, showOptOut, tagsByContact]);

  async function addContact() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Could not add contact.");
    setContacts((prev) => [json.contact, ...prev]);
    setForm(EMPTY);
    setAdding(false);
  }

  async function toggleOptOut(c: Contact) {
    const res = await fetch("/api/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, opt_out: !c.opt_out }),
    });
    const json = await res.json();
    if (res.ok)
      setContacts((prev) =>
        prev.map((x) => (x.id === c.id ? json.contact : x))
      );
  }

  async function remove(c: Contact) {
    if (!confirm(`Delete ${c.first_name ?? c.phone}? This cannot be undone.`))
      return;
    const res = await fetch(`/api/contacts?id=${c.id}`, { method: "DELETE" });
    if (res.ok) setContacts((prev) => prev.filter((x) => x.id !== c.id));
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="min-w-[180px] flex-1">
          <Input
            placeholder="Search name, phone, brokerage…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showOptOut}
            onChange={(e) => setShowOptOut(e.target.checked)}
          />
          Show opt-outs
        </label>
        <Button onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "Add contact"}
        </Button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-4 rounded-xl border border-line bg-white p-4">
          <div className="grid gap-3 md:grid-cols-3">
            {(
              [
                ["first_name", "First name"],
                ["last_name", "Last name"],
                ["phone", "Phone *"],
                ["email", "Email"],
                ["brokerage", "Brokerage"],
                ["community", "Community"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-muted">{label}</label>
                <Input
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex justify-end">
            <Button onClick={addContact} disabled={busy}>
              {busy ? "Saving…" : "Save contact"}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Brokerage</th>
              <th className="px-4 py-3">Community</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No contacts match. Import a CSV or add one to get started.
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-line/60">
                <td className="px-4 py-3 font-medium">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{c.phone}</td>
                <td className="px-4 py-3">{c.brokerage ?? "—"}</td>
                <td className="px-4 py-3">{c.community ?? "—"}</td>
                <td className="px-4 py-3">
                  {c.opt_out ? (
                    <Badge tone="bad">Opted out</Badge>
                  ) : (
                    <Badge tone="good">Active</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => toggleOptOut(c)}
                      className="text-xs text-muted hover:text-ink"
                    >
                      {c.opt_out ? "Re-activate" : "Opt out"}
                    </button>
                    <button
                      onClick={() => remove(c)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
