import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth
 * Body: { action: 'login' | 'signup' | 'signout', email?, password?, username? }
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { action, email, password, username } = body ?? {};
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

    // Basic username validation
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–30 characters: letters, numbers and underscores only.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
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

    // Insert profile row
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: username.toLowerCase(),
        email,
      });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
