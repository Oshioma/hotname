# hotname

Send anonymous messages to anyone — create a link, share it, receive messages.

---

## Stack

- **Next.js 15** — App Router, Server Components
- **Supabase Auth** — via `@supabase/ssr`
- **JavaScript** — plain JS (no TypeScript)

---

## Directory layout

```
hotname/
├── app/
│   ├── layout.js
│   ├── page.js                 (landing page)
│   ├── signup/page.js
│   ├── login/page.js
│   ├── dashboard/page.js       (protected, server component)
│   ├── send/page.js            (find a username)
│   ├── [username]/page.js      (public send page)
│   └── api/
│       ├── auth/route.js       (login / signup / signout)
│       └── send/route.js       (POST a message)
├── lib/supabase/
│   ├── server.js               (createServerClient)
│   └── client.js               (createBrowserClient)
├── middleware.js               (protect /dashboard and /send)
├── styles/globals.css
├── supabase.sql                (DB migration)
└── .env.local.example
```

---

## Database setup

Run `supabase.sql` in the Supabase SQL editor to create:

- `profiles` table — stores the public username for each user.
- `messages` table — stores anonymous messages sent to a username.

Row Level Security is enabled on both tables.

---

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in the values:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, never exposed to the client) |
| `NEXT_PUBLIC_SITE_URL` | Public URL of this app (e.g. `https://hotname.com`) |

---

## Running locally

```bash
npm install
cp .env.local.example .env.local
# fill in .env.local, then run the SQL migration in Supabase
npm run dev
```

