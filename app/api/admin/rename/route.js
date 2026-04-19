import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isAdmin } from '@/lib/admin';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * POST /api/admin/rename
 * Body: { target_username, new_username }
 * Admin-only. Renames a Hotname.
 */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const target = String(body?.target_username ?? '').replace(/^@/, '').trim().toLowerCase();
  const next   = String(body?.new_username    ?? '').replace(/^@/, '').trim().toLowerCase();

  if (!target || !next) {
    return NextResponse.json({ error: 'target_username and new_username are required.' }, { status: 400 });
  }
  if (!USERNAME_RE.test(next)) {
    return NextResponse.json({ error: 'New username must be 3–30 characters: letters, numbers and underscores only.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (!isAdmin(user.id)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });

  const service = createServiceClient();

  const { data: targetProfile } = await service
    .from('profiles').select('id, username').eq('username', target).maybeSingle();
  if (!targetProfile) return NextResponse.json({ error: 'Target Hotname not found.' }, { status: 404 });

  if (targetProfile.username === next) {
    return NextResponse.json({ ok: true, username: next });
  }

  const { data: collision } = await service
    .from('profiles').select('id').eq('username', next).maybeSingle();
  if (collision && collision.id !== targetProfile.id) {
    return NextResponse.json({ error: 'That Hotname is already taken.' }, { status: 409 });
  }

  const { error } = await service
    .from('profiles')
    .update({ username: next })
    .eq('id', targetProfile.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, username: next });
}
