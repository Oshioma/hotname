-- Hotname database schema
-- Run this in the Supabase SQL editor to set up the required tables.

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  bio          text,
  email        text,
  phone_number text,
  created_at   timestamptz default now()
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- ─────────────────────────────────────────────
-- MESSAGES
-- thread_id groups a conversation.
-- parent_id points to the message being replied to.
-- When sender_id is NULL the message was sent anonymously (public bio page).
-- Replies are only possible when both sides have accounts (sender_id NOT NULL).
-- ─────────────────────────────────────────────
create table if not exists messages (
  id                  uuid primary key default gen_random_uuid(),
  thread_id           uuid not null default gen_random_uuid(),
  parent_id           uuid references messages(id) on delete set null,
  sender_id           uuid references auth.users(id) on delete set null,
  recipient_username  text not null references profiles(username) on delete cascade,
  body                text not null,
  channel             text not null default 'app',  -- 'app' | 'sms' | 'whatsapp'
  platform            text default 'General',
  created_at          timestamptz default now()
);

create index if not exists messages_thread_id_idx on messages(thread_id);
create index if not exists messages_recipient_idx  on messages(recipient_username);

alter table messages enable row level security;

-- Anonymous (public bio page) sends are allowed
create policy "Anyone can send an anonymous message"
  on messages for insert
  with check (sender_id is null);

-- Authenticated users can send (including replies)
create policy "Authenticated users can send messages"
  on messages for insert to authenticated
  with check (auth.uid() = sender_id);

-- Recipients can read messages addressed to them
create policy "Recipients can read their own messages"
  on messages for select
  using (
    auth.uid() = (
      select id from profiles where username = recipient_username limit 1
    )
  );

-- Senders can read messages they sent (to see replies)
create policy "Senders can read their sent messages"
  on messages for select
  using (auth.uid() = sender_id);

-- ─────────────────────────────────────────────
-- CONTACTS
-- ─────────────────────────────────────────────
create table if not exists contacts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  contact_username text not null references profiles(username) on delete cascade,
  is_favorite      boolean not null default false,
  created_at       timestamptz default now(),
  unique(user_id, contact_username)
);

alter table contacts enable row level security;

create policy "Users can view their own contacts"
  on contacts for select using (auth.uid() = user_id);

create policy "Users can insert their own contacts"
  on contacts for insert with check (auth.uid() = user_id);

create policy "Users can update their own contacts"
  on contacts for update using (auth.uid() = user_id);

create policy "Users can delete their own contacts"
  on contacts for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- CHANNELS
-- Each user has one row per channel type.
-- value = phone number (whatsapp/sms), email, or postal address (post).
-- default_access = 'everyone' means visible to all on the bio page;
-- 'selected' means only users in channel_access can see it.
-- ─────────────────────────────────────────────
create table if not exists channels (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  type           text not null check (type in ('whatsapp', 'sms', 'email', 'post')),
  enabled        boolean not null default false,
  verified       boolean not null default false,
  value          text,
  default_access text not null default 'everyone' check (default_access in ('everyone', 'selected')),
  created_at     timestamptz default now(),
  unique(user_id, type)
);

alter table channels enable row level security;

create policy "Users can manage their own channels"
  on channels for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- CHANNEL ACCESS
-- When a channel's default_access is 'selected', only usernames
-- listed here can see that channel on the owner's bio page.
-- ─────────────────────────────────────────────
create table if not exists channel_access (
  id               uuid primary key default gen_random_uuid(),
  channel_id       uuid not null references channels(id) on delete cascade,
  allowed_username text not null references profiles(username) on delete cascade,
  created_at       timestamptz default now(),
  unique(channel_id, allowed_username)
);

alter table channel_access enable row level security;

create policy "Channel owner can manage access list"
  on channel_access for all
  using  (auth.uid() = (select user_id from channels where id = channel_id limit 1))
  with check (auth.uid() = (select user_id from channels where id = channel_id limit 1));
