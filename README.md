# hotname

Login system for the Hotname site.

This Next.js 15 app handles sign-in, sign-up, password reset, and secure session management. After authentication, users are redirected to `/security`.

---

## Stack

- **Next.js 15** — App Router, Server Components, Server Actions
- **Supabase Auth** — via `@supabase/ssr` (PKCE flow, no deprecated helpers)
- **TypeScript** — strict mode throughout
- **Zod** — server-side form validation

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, never exposed) |
| `NEXT_PUBLIC_SITE_URL` | Public URL of this site (e.g. `https://hotname.com`) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret (for bot protection) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |

---

## Running locally

```bash
npm install
cp .env.example .env.local
# fill in .env.local
npm run dev
```

---

## Auth flow

1. Users sign in or create an account at `/sign-in` or `/sign-up`.
2. After a successful sign-in, they are redirected to `/security`.
3. For password reset, a link is emailed that takes users through `/auth/callback?type=recovery` → `/reset-password`. After updating the password they are sent to `/security`.

