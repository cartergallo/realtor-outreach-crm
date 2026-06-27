# Realtor Outreach CRM

A private, single-rep web app to import realtor contacts, segment them, generate
personalized SMS drafts with Claude, **approve every message before it sends**,
send via Twilio, receive replies in an inbox, and handle opt-outs automatically.

Built with **Next.js (App Router) + TypeScript + Tailwind + Supabase
(Auth/Postgres/RLS + Edge Functions) + Twilio + Anthropic Claude**, deployable to
**Vercel**.

---

## Hard rules enforced in code

- **No scraping.** Contacts come from CSV import or manual entry only.
- **No iMessage / blue-bubble claims.** Baked into the Claude system prompt.
- **No sending to opt-outs.** Guarded at the send layer (campaign + reply) and at
  segment resolution.
- **Human approval required.** Campaign messages only send when a recipient is
  explicitly `approved`.
- **Every message stored.** Inbound and outbound both persist to `messages`.
- **Opt-out keywords**: STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT →
  `opt_out = true` (START/YES/UNSTOP re-subscribe).
- **Env vars only.** No secrets in code.
- **Basic error handling + structured logs** throughout (`src/lib/logger.ts`).
- **Mobile-friendly.** Responsive nav, tables, inbox.

---

## Project structure

```
realtor-crm/
├─ src/
│  ├─ app/
│  │  ├─ (app)/                 # authenticated app shell (Nav + auth gate)
│  │  │  ├─ dashboard/          # analytics tiles
│  │  │  ├─ contacts/           # list + CRUD
│  │  │  │  └─ import/          # CSV import
│  │  │  ├─ campaigns/
│  │  │  │  ├─ new/             # campaign creator
│  │  │  │  └─ [id]/            # draft review + send
│  │  │  ├─ inbox/              # conversations + reply composer
│  │  │  └─ settings/           # Twilio number + business info
│  │  ├─ api/
│  │  │  ├─ contacts/           # POST/PATCH/DELETE + import
│  │  │  ├─ campaigns/          # create, generate drafts, recipients
│  │  │  ├─ twilio/             # send + inbound webhook
│  │  │  └─ profile/            # settings save
│  │  ├─ auth/callback/         # magic-link/OAuth exchange
│  │  ├─ login/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx               # → /dashboard
│  │  └─ globals.css
│  ├─ components/               # Nav, tables, forms, inbox, ui primitives
│  ├─ lib/                      # supabase clients, claude, twilio, phone, optout, logger
│  └─ middleware.ts             # session refresh + route gating
├─ supabase/
│  ├─ migrations/
│  │  ├─ 0001_schema.sql        # tables, enums, triggers
│  │  └─ 0002_rls.sql           # row-level security
│  ├─ functions/
│  │  ├─ _shared/util.ts
│  │  ├─ twilio-inbound/        # Deno webhook (opt-out handling)
│  │  └─ twilio-send/           # Deno send (optional)
│  └─ config.toml
├─ scripts/
│  ├─ seed.ts                   # demo user + data
│  └─ sample-contacts.csv       # test CSV (incl. invalid + duplicate rows)
├─ .env.example
└─ package.json
```

---

## Environment variables

Copy `.env.example` → `.env.local` and fill in. See that file for the full,
commented list. Summary:

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | server | Used to verify Twilio webhook signature |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Admin client (webhook, seed) |
| `ANTHROPIC_API_KEY` | server only | Claude drafting |
| `ANTHROPIC_MODEL` | server | Defaults to `claude-sonnet-4-6` |
| `TWILIO_ACCOUNT_SID` | server | Twilio REST auth |
| `TWILIO_AUTH_TOKEN` | server | Twilio REST auth + signature check |
| `TWILIO_FROM_NUMBER` | server | Default sender (per-user override in Settings) |

Edge Functions use `SB_URL`, `SB_SERVICE_ROLE_KEY`, `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN`, `PUBLIC_WEBHOOK_BASE` (set via `supabase secrets set`).

---

## Local setup

```bash
# 1. Install
npm install

# 2. Start Supabase locally (or use a cloud project)
supabase start
supabase db reset          # applies migrations in supabase/migrations

# 3. Configure env
cp .env.example .env.local # then fill in values from `supabase status`

# 4. Seed demo data (creates demo@alago.test / DemoPass123!)
npm run seed

# 5. Run
npm run dev                # http://localhost:3000
```

If you use a **cloud** Supabase project instead of local: run the two SQL files
in `supabase/migrations/` via the SQL editor (0001 then 0002), then `npm run seed`.

---

## How to test each piece locally

1. **Auth** — go to `/login`, sign in with the seeded demo user → `/dashboard`.
2. **Contacts CRUD** — `/contacts`: add, edit opt-out, delete, search, tag-filter.
3. **CSV import** — `/contacts/import`, upload `scripts/sample-contacts.csv`.
   Expect: valid rows imported, `bad-number` row skipped, duplicate phone upserted.
4. **Campaign** — `/campaigns/new`: name it, set an offer, pick a segment, create.
5. **Claude drafts** — on the campaign page, “Generate drafts with Claude”
   (needs `ANTHROPIC_API_KEY`; without it, a template fallback fills in).
6. **Review + send** — edit any draft, Approve, then “Send approved”
   (needs Twilio creds + a verified number; the opted-out seed contact is skipped).
7. **Inbound webhook** — simulate Twilio locally:
   ```bash
   curl -X POST http://localhost:3000/api/twilio/inbound \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "From=+17045550142&To=+17045551234&Body=STOP"
   ```
   (Signature check is skipped when `NODE_ENV !== production`.) The contact flips
   to opted-out; an inbound message is stored.
8. **Inbox** — `/inbox`: open a thread, send a reply (blocked for opt-outs).
9. **Analytics** — `/dashboard` shows totals, sent, replies, reply rate, opt-outs.

---

## Deployment

### Supabase
1. Create a project. Run `supabase/migrations/0001_schema.sql` then `0002_rls.sql`.
2. Deploy functions:
   ```bash
   supabase functions deploy twilio-inbound --no-verify-jwt
   supabase functions deploy twilio-send
   supabase secrets set \
     SB_URL=... SB_SERVICE_ROLE_KEY=... \
     TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... \
     TWILIO_FROM_NUMBER=+1... \
     PUBLIC_WEBHOOK_BASE=https://<project>.functions.supabase.co
   ```

### Vercel
1. Import the repo. Framework preset: **Next.js**.
2. Add all server + public env vars from the table above.
3. Deploy. Set `NEXT_PUBLIC_APP_URL` to your production URL.

### Twilio
- Point your number’s **“A message comes in”** webhook (HTTP POST) to **one** of:
  - `https://<your-vercel-app>/api/twilio/inbound` (Next route), or
  - `https://<project>.functions.supabase.co/twilio-inbound` (Edge Function).
- Make sure the number matches the **Sending number** in `/settings`.

---

## Compliance notes

This app gives you the tooling to send compliant SMS, but **you are the sender**.
Make sure you have prior express consent for every contact, include opt-out
language in your messaging, honor opt-outs (the app enforces this), and follow
TCPA/CTIA and carrier rules. The app is intentionally opt-in-respecting and
approval-gated by design.
