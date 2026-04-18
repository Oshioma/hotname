import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Handles the Supabase auth callback (PKCE code exchange).
 *
 * Flow:
 *   1. Exchange `code` for a session.
 *   2. If type=recovery, redirect to /reset-password.
 *   3. Otherwise, redirect to /security.
 *   4. Any error redirects back to /sign-in with a safe message.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const type = url.searchParams.get("type");

  // Surface provider/email errors back to the sign-in page
  if (error) {
    const message = errorDescription ?? error;
    return NextResponse.redirect(
      `${siteUrl}/sign-in?error=${encodeURIComponent(message)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(siteUrl);
  }

  // Exchange the PKCE code for a session
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(`${siteUrl}/sign-in?error=auth_failed`);
  }

  // Password recovery flow → redirect to reset-password
  if (type === "recovery") {
    return NextResponse.redirect(`${siteUrl}/reset-password`);
  }

  // Standard auth (sign-in / sign-up) → redirect to security page
  return NextResponse.redirect(`${siteUrl}/security`);
}
