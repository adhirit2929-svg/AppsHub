-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run

create table if not exists public.hub_accounts (
  username_key text primary key,
  username text not null unique,
  display_name text not null,
  avatar text not null default '',
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  theme text not null default 'light' check (theme in ('light', 'dark')),
  agent_data_perm boolean not null default true,
  moderation_status text not null default 'active' check (moderation_status in ('active', 'suspended', 'banned')),
  ban_message text not null default '',
  suspended_until_ms bigint not null default 0,
  buckets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hub_friendships (
  pair_id text primary key,
  user_a text not null,
  user_b text not null,
  requester_key text not null,
  status text not null check (status in ('pending', 'accepted')),
  profiles jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hub_messages (
  id text primary key,
  chat_id text not null,
  sender_key text not null,
  recipient_key text not null,
  sender_username text not null,
  sender_display_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_hub_friendships_users on public.hub_friendships (user_a, user_b);
create index if not exists idx_hub_messages_chat_created on public.hub_messages (chat_id, created_at);

create table if not exists public.hub_online_apps (
  app_id text primary key,
  name text not null,
  description text not null default '',
  about text not null default '',
  icon text not null default '',
  author_uid text not null,
  author_username text not null default '',
  author_username_key text not null default '',
  author_display_name text not null default '',
  source_mode text not null default 'html' check (source_mode in ('html', 'bundle', 'link')),
  app_url text not null default '',
  data_storage_mode text not null default 'self' check (data_storage_mode in ('self', 'hub_supabase')),
  code text not null default '',
  html_code text not null default '',
  css_code text not null default '',
  js_code text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'disabled')),
  version integer not null default 1,
  admin_note text not null default '',
  reviewed_by_uid text not null default '',
  has_pending_update boolean not null default false,
  pending_update jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hub_online_apps
  add column if not exists about text not null default '',
  add column if not exists app_url text not null default '',
  add column if not exists data_storage_mode text not null default 'self';

do $$
begin
  alter table public.hub_online_apps drop constraint if exists hub_online_apps_source_mode_check;
  alter table public.hub_online_apps add constraint hub_online_apps_source_mode_check check (source_mode in ('html', 'bundle', 'link'));
exception when others then null; end $$;

create index if not exists idx_hub_online_apps_author on public.hub_online_apps (author_uid);
create index if not exists idx_hub_online_apps_status on public.hub_online_apps (status);

alter table public.hub_online_apps enable row level security;

drop policy if exists "hub_online_apps_open" on public.hub_online_apps;
create policy "hub_online_apps_open" on public.hub_online_apps
  for all to anon, authenticated using (true) with check (true);

alter table public.hub_accounts enable row level security;
alter table public.hub_friendships enable row level security;
alter table public.hub_messages enable row level security;

drop policy if exists "hub_accounts_open" on public.hub_accounts;
create policy "hub_accounts_open" on public.hub_accounts
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "hub_friendships_open" on public.hub_friendships;
create policy "hub_friendships_open" on public.hub_friendships
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "hub_messages_open" on public.hub_messages;
create policy "hub_messages_open" on public.hub_messages
  for all to anon, authenticated using (true) with check (true);

-- Enable real-time updates for contacts and chat messages
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'hub_friendships'
  ) then
    alter publication supabase_realtime add table public.hub_friendships;
  end if;
exception when others then null; end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'hub_messages'
  ) then
    alter publication supabase_realtime add table public.hub_messages;
  end if;
exception when others then null; end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'hub_online_apps'
  ) then
    alter publication supabase_realtime add table public.hub_online_apps;
  end if;
exception when others then null; end $$;
