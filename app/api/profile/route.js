import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PHONE_RE = /^\+[1-9]\d{6,14}$/;

/**
 * PATCH /api/profile
 * Body: { display_name?: string, phone_number?: string }
 * Updates the authenticated user's profile.
 */
export async function PATCH(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { display_name, phone_number } = body ?? {};

  if (display_name !== undefined && (typeof display_name !== 'string' || !display_name.trim())) {
    return NextResponse.json({ error: 'display_name cannot be blank.' }, { status: 400 });
  }

  if (phone_number !== undefined && phone_number !== '' && !PHONE_RE.test(phone_number)) {
    return NextResponse.json(
      { error: 'Phone number must be in E.164 format (e.g. +447911123456).' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const updates = {};
  if (display_name !== undefined) updates.display_name = display_name.trim();
  if (phone_number !== undefined) updates.phone_number = phone_number || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
