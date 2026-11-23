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
