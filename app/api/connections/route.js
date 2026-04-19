import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const MAX_MESSAGE = 500;

/**
 * POST /api/connections
 * Body: { owner_username, message }
 * Creates a pending connection request. Requester must be authenticated.
 */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { owner_username, message } = body ?? {};
  if (!owner_username || typeof owner_username !== 'string') {
    return NextResponse.json({ error: 'owner_username is required.' }, { status: 400 });
  }
  const text = (message ?? '').trim();
  if (!text) {
    return NextResponse.json({ error: 'Please introduce yourself.' }, { status: 400 });
  }
  if (text.length > MAX_MESSAGE) {
    return NextResponse.json({ error: `Message must be ${MAX_MESSAGE} characters or fewer.` }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to request a connection.' }, { status: 401 });

  const service = createServiceClient();

  const { data: requesterProfile } = await service
    .from('profiles').select('username').eq('id', user.id).maybeSingle();
  if (!requesterProfile) {
    return NextResponse.json({ error: 'Complete your profile first.' }, { status: 400 });
  }

  const { data: owner } = await service
    .from('profiles').select('id, username').eq('username', owner_username.toLowerCase()).maybeSingle();
  if (!owner) return NextResponse.json({ error: 'Hotname not found.' }, { status: 404 });

  if (owner.id === user.id) {
    return NextResponse.json({ error: 'You cannot connect with yourself.' }, { status: 400 });
  }

  // If an existing row is pending or accepted, surface the current state.
  const { data: existing } = await service
    .from('user_connections')
    .select('status')
    .eq('requester_id', user.id)
    .eq('owner_id', owner.id)
    .maybeSingle();
  if (existing && (existing.status === 'pending' || existing.status === 'accepted')) {
    return NextResponse.json({ ok: true, status: existing.status });
  }

  // If a prior row was declined, overwrite it with a fresh pending request.
  const payload = {
    requester_id: user.id,
    requester_username: requesterProfile.username,
    owner_id: owner.id,
    owner_username: owner.username,
    message: text,
    status: 'pending',
    responded_at: null,
  };

  const { error } = await service
    .from('user_connections')
    .upsert(payload, { onConflict: 'requester_id,owner_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: 'pending' });
}

/**
 * PATCH /api/connections
 * Body: { id, action: 'accept' | 'decline' }
 * Owner only.
 */
export async function PATCH(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  const { id, action } = body ?? {};
  if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const service = createServiceClient();

  const { data: conn } = await service
    .from('user_connections')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });
  if (conn.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your connection to act on.' }, { status: 403 });
  }

  const { error } = await service
    .from('user_connections')
    .update({
      status: action === 'accept' ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
