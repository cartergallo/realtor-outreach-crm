-- ============================================================
-- Consent tracking for SMS opt-ins (TCPA record-keeping)
-- Adds columns to capture WHEN, HOW, and WITH WHAT WORDING
-- each contact agreed to receive texts.
-- ============================================================

alter table public.contacts
  add column if not exists consent_status text
    not null default 'none'
    check (consent_status in ('none', 'opted_in', 'opted_out')),
  add column if not exists consent_source text,        -- e.g. 'landing_page', 'verbal', 'import'
  add column if not exists consent_method text,         -- e.g. 'web_form_checkbox'
  add column if not exists consent_text text,           -- exact checkbox wording shown
  add column if not exists consent_timestamp timestamptz,
  add column if not exists consent_ip text;             -- IP at time of opt-in, if web

create index if not exists contacts_consent_idx
  on public.contacts(owner_id, consent_status);
