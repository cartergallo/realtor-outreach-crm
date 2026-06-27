-- ============================================================
-- Realtor Outreach CRM — Schema
-- Build order step 1: tables, enums, indexes, helpers
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type contact_status as enum ('active', 'opt_out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_direction as enum ('outbound', 'inbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status as enum ('draft', 'queued', 'sent', 'delivered', 'failed', 'received');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_status as enum ('draft', 'review', 'sending', 'sent', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recipient_status as enum ('pending', 'drafted', 'approved', 'sent', 'skipped', 'failed');
exception when duplicate_object then null; end $$;

-- ---------- profiles (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  twilio_from_number text,           -- E.164, e.g. +17045551234
  rep_name text,
  rep_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- contacts ----------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text not null,               -- normalized E.164
  email text,
  brokerage text,
  community text,
  notes text,
  status contact_status not null default 'active',
  opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, phone)
);
create index if not exists contacts_owner_idx on public.contacts(owner_id);
create index if not exists contacts_optout_idx on public.contacts(owner_id, opt_out);

-- ---------- tags & contact_tags ----------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default '#6366f1',
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists public.contact_tags (
  contact_id uuid not null references public.contacts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  primary key (contact_id, tag_id)
);
create index if not exists contact_tags_tag_idx on public.contact_tags(tag_id);

-- ---------- campaigns ----------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  offer text,
  community text,
  template text,                     -- base message template w/ {{placeholders}}
  segment jsonb not null default '{}'::jsonb,  -- filter snapshot: {tag_ids, community, brokerage}
  status campaign_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaigns_owner_idx on public.campaigns(owner_id);

-- ---------- campaign_recipients ----------
create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  draft_body text,
  status recipient_status not null default 'pending',
  sent_message_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, contact_id)
);
create index if not exists camp_recip_campaign_idx on public.campaign_recipients(campaign_id);
create index if not exists camp_recip_contact_idx on public.campaign_recipients(contact_id);

-- ---------- messages (every inbound + outbound) ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  direction message_direction not null,
  body text not null,
  status message_status not null default 'queued',
  from_number text,
  to_number text,
  twilio_sid text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists messages_owner_idx on public.messages(owner_id);
create index if not exists messages_contact_idx on public.messages(contact_id, created_at);
create index if not exists messages_sid_idx on public.messages(twilio_sid);

-- ---------- audit_logs ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  action text not null,
  entity text,
  entity_id uuid,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_owner_idx on public.audit_logs(owner_id, created_at);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger trg_profiles_updated before update on public.profiles
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger trg_contacts_updated before update on public.contacts
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger trg_campaigns_updated before update on public.campaigns
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger trg_recip_updated before update on public.campaign_recipients
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- ---------- auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end $$;

do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception when duplicate_object then null; end $$;
