-- Hotname database schema
-- Run this in the Supabase SQL editor to set up the required tables.

-- Profiles table: one row per user, stores the public username and phone.
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  email        text,
  phone_number text,
  created_at   timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Anyone can read profiles (needed for the public send page to look up usernames)
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

-- Users can insert their own profile
create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Messages table: stores messages sent to a user (in-app, SMS, WhatsApp).
create table if not exists messages (
  id                  uuid primary key default gen_random_uuid(),
  sender_id           uuid references auth.users(id) on delete set null,
  recipient_username  text not null references profiles(username) on delete cascade,
  body                text not null,
  channel             text not null default 'app',  -- 'app' | 'sms' | 'whatsapp'
  platform            text default 'General',
  created_at          timestamptz default now()
);

-- Enable Row Level Security
alter table messages enable row level security;

-- Authenticated users can insert messages
create policy "Authenticated users can send messages"
  on messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- Only the recipient can read their own messages
create policy "Recipients can read their own messages"
  on messages for select
  using (
    auth.uid() = (
      select id from profiles where username = recipient_username limit 1
    )
  );

-- Senders can read messages they sent
create policy "Senders can read their sent messages"
  on messages for select
  using (auth.uid() = sender_id);

-- Contacts table: users' saved contacts and favorites.
create table if not exists contacts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  contact_username text not null references profiles(username) on delete cascade,
  is_favorite      boolean not null default false,
  created_at       timestamptz default now(),
  unique(user_id, contact_username)
);

-- Enable Row Level Security
alter table contacts enable row level security;

-- Users can only see their own contacts
create policy "Users can view their own contacts"
  on contacts for select
  using (auth.uid() = user_id);

-- Users can insert their own contacts
create policy "Users can insert their own contacts"
  on contacts for insert
  with check (auth.uid() = user_id);

-- Users can update their own contacts (e.g. toggle favorite)
create policy "Users can update their own contacts"
  on contacts for update
  using (auth.uid() = user_id);

-- Users can delete their own contacts
create policy "Users can delete their own contacts"
  on contacts for delete
  using (auth.uid() = user_id);
