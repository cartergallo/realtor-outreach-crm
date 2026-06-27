"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/inbox", label: "Inbox" },
  { href: "/settings", label: "Settings" },
];

export default function Nav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-line bg-paper px-4 py-3 md:hidden">
        <span className="font-display text-lg">Outreach</span>
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-line px-3 py-1.5 text-sm"
        >
          Menu
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } border-b border-line bg-paper md:block md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r`}
      >
        <div className="hidden px-6 py-6 md:block">
          <div className="font-display text-2xl tracking-tight">Outreach</div>
          <div className="text-xs text-muted">Realtor CRM</div>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-2">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-clay text-white"
                    : "text-ink hover:bg-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 py-4 md:absolute md:bottom-0 md:w-60">
          <div className="truncate px-3 text-xs text-muted">{email}</div>
          <button
            onClick={signOut}
            className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-left text-sm hover:bg-paper"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
