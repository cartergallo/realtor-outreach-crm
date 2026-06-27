"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import Link from "next/link";
import { Button, Card } from "@/components/ui";

type Result = {
  received: number;
  upserted: number;
  skipped: number;
  errors: { row: number; reason: string }[];
};

export default function ImportPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRows(res.data);
        setHeaders(res.meta.fields ?? []);
      },
      error: (err) => setError(err.message),
    });
  }

  async function upload() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/contacts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Import failed.");
    setResult(json);
    router.refresh();
  }

  return (
    <div>
      <Link href="/contacts" className="text-sm text-muted hover:text-ink">
        ← Back to contacts
      </Link>
      <h1 className="mt-2 font-display text-3xl tracking-tight">Import contacts</h1>
      <p className="mb-6 text-sm text-muted">
        Upload a CSV. We map common column names automatically. A{" "}
        <span className="font-mono">phone</span> column is required; rows without
        a valid phone are skipped.
      </p>

      <Card className="mb-6 p-6">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-clay file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-clayd"
        />
        <p className="mt-3 text-xs text-muted">
          Recognized columns: first name, last name, phone, email, brokerage,
          community, notes.
        </p>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {rows.length > 0 && !result && (
        <Card className="mb-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="text-sm">
              <span className="font-medium">{fileName}</span> —{" "}
              {rows.length} rows
            </div>
            <Button onClick={upload} disabled={busy}>
              {busy ? "Importing…" : `Import ${rows.length} contacts`}
            </Button>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-paper">
                <tr className="text-left text-muted">
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 25).map((r, i) => (
                  <tr key={i} className="border-t border-line/50">
                    {headers.map((h) => (
                      <td key={h} className="px-3 py-1.5">
                        {r[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 25 && (
            <div className="border-t border-line px-4 py-2 text-xs text-muted">
              Showing first 25 of {rows.length}.
            </div>
          )}
        </Card>
      )}

      {result && (
        <Card className="p-6">
          <h2 className="font-display text-xl">Import complete</h2>
          <div className="mt-3 flex gap-6 text-sm">
            <div>
              <div className="font-display text-2xl text-moss">
                {result.upserted}
              </div>
              <div className="text-muted">Added / updated</div>
            </div>
            <div>
              <div className="font-display text-2xl text-clay">
                {result.skipped}
              </div>
              <div className="text-muted">Skipped</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium uppercase text-muted">
                Skipped rows
              </div>
              <ul className="mt-1 max-h-40 overflow-auto text-xs text-muted">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-5">
            <Link
              href="/contacts"
              className="rounded-lg bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clayd"
            >
              View contacts
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
