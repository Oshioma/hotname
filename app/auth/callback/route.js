import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /auth/callback
 * Handles two Supabase auth flows:
 *  - Email confirmation: ?token_hash=xxx&type=signup (or email_change, etc.)
 *  - Password reset (PKCE): ?code=xxx
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code       = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type       = searchParams.get('type');
  const next       = searchParams.get('next') ?? '/dashboard';

  const supabase = await createClient();

  if (token_hash && type) {
    // Email confirmation / magic-link flow
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (code) {
    // PKCE flow — password reset
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=The+link+has+expired+or+is+invalid.`);
}
