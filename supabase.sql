-- Hotname database schema
-- Run this in the Supabase SQL editor to set up the required tables.

-- Profiles table: one row per user, stores the public username.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  email       text,
  created_at  timestamptz default now()
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

-- Messages table: stores anonymous messages sent to a user.
create table if not exists messages (
  id                  uuid primary key default gen_random_uuid(),
  recipient_username  text not null references profiles(username) on delete cascade,
  body                text not null,
  platform            text default 'General',
  created_at          timestamptz default now()
);

-- Enable Row Level Security
alter table messages enable row level security;

-- Anyone can insert a message (anonymous sends)
create policy "Anyone can send a message"
  on messages for insert
  with check (true);

-- Only the recipient can read their own messages
create policy "Recipients can read their own messages"
  on messages for select
  using (
    auth.uid() = (
      select id from profiles where username = recipient_username limit 1
    )
  );
