-- ============================================================
-- Row Level Security — every row is scoped to owner_id = auth.uid()
-- profiles use id = auth.uid()
-- Service role (Edge Functions) bypasses RLS automatically.
-- ============================================================

alter table public.profiles            enable row level security;
alter table public.contacts            enable row level security;
alter table public.tags                enable row level security;
alter table public.contact_tags        enable row level security;
alter table public.campaigns           enable row level security;
alter table public.campaign_recipients enable row level security;
alter table public.messages            enable row level security;
alter table public.audit_logs          enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert with check (id = auth.uid());

-- ---------- generic owner_id tables ----------
-- contacts
drop policy if exists "contacts_all" on public.contacts;
create policy "contacts_all" on public.contacts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- tags
drop policy if exists "tags_all" on public.tags;
create policy "tags_all" on public.tags
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- contact_tags
drop policy if exists "contact_tags_all" on public.contact_tags;
create policy "contact_tags_all" on public.contact_tags
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- campaigns
drop policy if exists "campaigns_all" on public.campaigns;
create policy "campaigns_all" on public.campaigns
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- campaign_recipients
drop policy if exists "camp_recip_all" on public.campaign_recipients;
create policy "camp_recip_all" on public.campaign_recipients
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- messages (insert handled by Edge Functions via service role; users read/own)
drop policy if exists "messages_all" on public.messages;
create policy "messages_all" on public.messages
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- audit_logs (read own; writes mostly via service role)
drop policy if exists "audit_select" on public.audit_logs;
create policy "audit_select" on public.audit_logs
  for select using (owner_id = auth.uid());
drop policy if exists "audit_insert" on public.audit_logs;
create policy "audit_insert" on public.audit_logs
  for insert with check (owner_id = auth.uid());
