import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const PHONE_RE = /^\+[1-9]\d{6,14}$/;

/**
 * POST /api/auth
 * Body: { action: 'login' | 'signup' | 'signout', ... }
 */
export async function POST(request) {
  let body = {};
  const contentType = request.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('form')) {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    } else {
      // Best-effort — treat empty or unknown content types as no body.
      const text = await request.text();
      if (text) {
        try { body = JSON.parse(text); }
        catch {
          return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
        }
      }
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const { action, email, password, username, display_name, phone_number } = body ?? {};
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const supabase = await createClient();

  // ── Sign out ──────────────────────────────────────────────────────────────
  if (action === 'signout') {
    await supabase.auth.signOut();
    // 303 forces the browser to follow with a GET; 307 (the default) would
    // keep the POST and hit the home page as POST, which errors out.
    return NextResponse.redirect(new URL('/', request.url), 303);
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  if (action === 'login') {
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  }

  // ── Sign up ───────────────────────────────────────────────────────────────
  if (action === 'signup') {
    const consent = body?.messaging_consent === true || body?.messaging_consent === 'on';
    if (!consent) {
      return NextResponse.json(
        { error: 'Please agree to the Terms and messaging policy to continue.' },
        { status: 400 }
      );
    }
    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Email, password and username are required.' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–30 characters: letters, numbers and underscores only.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    if (phone_number && !PHONE_RE.test(phone_number)) {
      return NextResponse.json(
        { error: 'Phone number must be in E.164 format (e.g. +447911123456).' },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const handle = username.toLowerCase();

    // Check username uniqueness via service role (no auth needed)
    const { data: existing } = await service
      .from('profiles')
      .select('id')
      .eq('username', handle)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard` },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Use the service role client so the insert works whether or not the
    // user has an active session yet (email confirmation may be enabled).
    if (data.user) {
      const headers = request.headers;
      const ip =
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headers.get('x-real-ip') ||
        headers.get('cf-connecting-ip') ||
        null;
      const ua = headers.get('user-agent') || null;

      const { error: profileError } = await service.from('profiles').insert({
        id: data.user.id,
        username: handle,
        display_name: display_name?.trim() || handle,
        email,
        phone_number: phone_number || null,
        messaging_consent: true,
        messaging_consent_at: new Date().toISOString(),
        messaging_consent_ip: ip,
        messaging_consent_ua: ua,
      });
      if (profileError) {
        // Roll back the auth user so they can retry with the same email.
        await service.auth.admin.deleteUser(data.user.id).catch(() => {});
        const msg =
          profileError.code === '23505'
            ? 'That username is already taken.'
            : 'Could not set up your profile. Please try again.';
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  }

  // ── Forgot password ───────────────────────────────────────────────────────
  if (action === 'forgot-password') {
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }
    // Always return ok — never reveal whether the email exists
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });
    return NextResponse.json({ ok: true });
  }

  // ── Update password (after reset link) ───────────────────────────────────
  if (action === 'update-password') {
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
