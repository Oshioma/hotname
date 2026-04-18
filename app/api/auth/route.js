import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PHONE_RE = /^\+[1-9]\d{6,14}$/;

/**
 * POST /api/auth
 * Body: { action: 'login' | 'signup' | 'signout', ... }
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { action, email, password, username, display_name, phone_number } = body ?? {};
  const supabase = await createClient();

  // ── Sign out ──────────────────────────────────────────────────────────────
  if (action === 'signout') {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/', request.url));
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

    // Check username uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: username.toLowerCase(),
        display_name: display_name?.trim() || username,
        email,
        phone_number: phone_number || null,
      });
      if (profileError) {
        return NextResponse.json({ error: 'Account created but profile setup failed. Please contact support.' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
