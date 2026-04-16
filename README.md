# hotname-auth

Central authentication service for Hotname applications.

This Next.js 15 app lives on a dedicated domain and handles sign-in, sign-up, password reset, and secure session management for multiple downstream websites.

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
| `NEXT_PUBLIC_SITE_URL` | Public URL of this auth app (e.g. `https://auth.hotname.com`) |
| `AUTH_ALLOWED_RETURN_TO` | Comma-separated list of allowed `returnTo` origins |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret (for bot protection, when enabled) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |

---

## How `returnTo` validation works

All `returnTo` values are validated against the `AUTH_ALLOWED_RETURN_TO` allowlist before any redirect is performed. Validation is origin-based (scheme + host + port), so path manipulation cannot bypass it.

If the supplied `returnTo` is missing, malformed, uses a non-HTTP/HTTPS scheme, or its origin is not in the allowlist, the user is redirected to `NEXT_PUBLIC_SITE_URL` instead. This eliminates open-redirect vulnerabilities.

---

## Running locally

```bash
npm install
cp .env.example .env.local
# fill in .env.local
npm run dev
```

---

## How downstream apps redirect here

Redirect users to this auth app with the optional `app` and `returnTo` query params:

```
https://auth.hotname.com/sign-in?app=guestlist&returnTo=https://guestlist.com/auth/callback
```

After a successful sign-in, Supabase issues a session cookie and the user is redirected to the validated `returnTo` URL. The downstream app then has an authenticated Supabase session it can use.

For password reset, the reset email link returns to `/auth/callback?type=recovery`, which redirects to `/reset-password`. After a successful password update the user is sent to `/security`.

### Allowlist example

```
AUTH_ALLOWED_RETURN_TO=https://guestlist.com,https://dashboard.hotname.com
```

Only these origins are trusted for redirects. All others fall back to `NEXT_PUBLIC_SITE_URL`.
