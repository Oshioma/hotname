-- Hotname database schema
-- Run this in the Supabase SQL editor to set up the required tables.
--
-- Hotname is a permission-based contact-identity layer.
--   • One person shares only a Hotname (e.g. @oshi)
--   • The owner controls which channels are visible and how others can reach them
--   • Instead of exposing raw details, the profile exposes ACCESS LEVELS
--   • Visitors submit requests; owners approve / deny / redirect them
--
-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
create table if not exists profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  username                text unique not null,                 -- the Hotname (lowercase)
  display_name            text,
  bio                     text,                                 -- short status line under the name
  location                text,                                 -- optional free-form location
  email                   text,
  phone_number            text,
  verified                boolean not null default false,       -- email/phone verified trust marker
  messaging_consent       boolean not null default false,       -- agreed to Terms + WhatsApp policy
  messaging_consent_at    timestamptz,
  created_at              timestamptz default now()
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- ─────────────────────────────────────────────
-- CHANNELS
-- One row per (user, channel_type). The `value` stores the raw detail
-- (phone / email / url / handle) — this is NEVER exposed on the public
-- profile unless access_mode = 'open'.
--
-- access_mode controls visibility on the public profile:
--   open      → detail is directly visible / clickable by anyone
--   request   → channel is listed but details hidden; requires approval
--   selected  → only usernames in channel_access can see it
--   hidden    → not shown on the profile at all
-- ─────────────────────────────────────────────
create table if not exists channels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in (
    'whatsapp', 'sms', 'phone', 'email',
    'telegram', 'signal', 'instagram',
    'website',  'booking', 'post'
  )),
  value       text,                                   -- phone / email / url / handle
  verified    boolean not null default false,         -- twilio-verified for phone types
  access_mode text not null default 'hidden' check (access_mode in (
    'open', 'request', 'selected', 'hidden'
  )),
  created_at  timestamptz default now(),
  unique(user_id, type)
);

alter table channels enable row level security;

create policy "Anyone can read channel metadata (type + access_mode only)"
  on channels for select using (true);

create policy "Owner can manage own channels"
  on channels for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- CHANNEL ACCESS
-- Username-level allowlist for access_mode = 'selected'.
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
  using      (auth.uid() = (select user_id from channels where id = channel_id limit 1))
  with check (auth.uid() = (select user_id from channels where id = channel_id limit 1));

create policy "Allowed user can see their own entry"
  on channel_access for select
  using (
    allowed_username = (select username from profiles where id = auth.uid() limit 1)
  );

-- ─────────────────────────────────────────────
-- CONNECTION REQUESTS
-- Someone asks an owner for access to a specific channel.
-- Owner may approve, deny, or redirect to another channel.
-- ─────────────────────────────────────────────
create table if not exists connection_requests (
  id                  uuid primary key default gen_random_uuid(),
  requester_id        uuid not null references auth.users(id) on delete cascade,
  requester_username  text not null,
  owner_id            uuid not null references auth.users(id) on delete cascade,
  owner_username      text not null,
  channel_type        text not null,                  -- requested channel
  reason              text,                           -- why do you want to connect?
  status              text not null default 'pending' check (status in (
    'pending', 'approved', 'denied', 'redirected'
  )),
  redirected_to       text,                           -- channel type the owner suggested instead
  created_at          timestamptz default now(),
  responded_at        timestamptz,
  deleted_at          timestamptz                     -- soft-delete → Deleted tab on /requests
);

create index if not exists connection_requests_owner_idx
  on connection_requests(owner_id, status, created_at desc);
create index if not exists connection_requests_requester_idx
  on connection_requests(requester_id, created_at desc);

alter table connection_requests enable row level security;

create policy "Requester can insert own request"
  on connection_requests for insert to authenticated
  with check (auth.uid() = requester_id);

create policy "Owner and requester can read their requests"
  on connection_requests for select
  using (auth.uid() = owner_id or auth.uid() = requester_id);

create policy "Owner can update (approve/deny/redirect) requests"
  on connection_requests for update
  using (auth.uid() = owner_id);

-- ─────────────────────────────────────────────
-- USER CONNECTIONS
-- Gatekeeper layer above messaging. Viewers must first request to
-- connect; only once the owner accepts can they send messages through
-- any of the owner's channels.
-- ─────────────────────────────────────────────
create table if not exists user_connections (
  id                  uuid primary key default gen_random_uuid(),
  requester_id        uuid not null references auth.users(id) on delete cascade,
  requester_username  text not null,
  owner_id            uuid not null references auth.users(id) on delete cascade,
  owner_username      text not null,
  message             text,
  status              text not null default 'pending' check (status in (
    'pending', 'accepted', 'declined'
  )),
  created_at          timestamptz default now(),
  responded_at        timestamptz,
  unique(requester_id, owner_id)
);

create index if not exists user_connections_owner_idx
  on user_connections(owner_id, status, created_at desc);
create index if not exists user_connections_requester_idx
  on user_connections(requester_id, created_at desc);

alter table user_connections enable row level security;

create policy "Requester can insert own connection"
  on user_connections for insert to authenticated
  with check (auth.uid() = requester_id);

create policy "Owner and requester can read their connections"
  on user_connections for select
  using (auth.uid() = owner_id or auth.uid() = requester_id);

create policy "Owner can update (accept/decline) connections"
  on user_connections for update
  using (auth.uid() = owner_id);
