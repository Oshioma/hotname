import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getChannelId(supabase, userId, type) {
  const { data } = await supabase
    .from('channels')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * POST /api/channels/access
 * Body: { type: string, username: string }
 * Adds a user to a channel's access list (creates channel row if needed).
 */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { type, username } = body ?? {};
  if (!type || !username) {
    return NextResponse.json({ error: 'type and username are required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // Verify the target username exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // Ensure channel row exists
  await supabase.from('channels').upsert(
    { user_id: user.id, type },
    { onConflict: 'user_id,type', ignoreDuplicates: true }
  );

  const channelId = await getChannelId(supabase, user.id, type);
  if (!channelId) return NextResponse.json({ error: 'Channel not found.' }, { status: 404 });

  const { error } = await supabase
    .from('channel_access')
    .upsert(
      { channel_id: channelId, allowed_username: profile.username },
      { onConflict: 'channel_id,allowed_username', ignoreDuplicates: true }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/channels/access
 * Body: { type: string, username: string }
 */
export async function DELETE(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { type, username } = body ?? {};
  if (!type || !username) {
    return NextResponse.json({ error: 'type and username are required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const channelId = await getChannelId(supabase, user.id, type);
  if (!channelId) return NextResponse.json({ ok: true });

  await supabase
    .from('channel_access')
    .delete()
    .eq('channel_id', channelId)
    .eq('allowed_username', username.toLowerCase());

  return NextResponse.json({ ok: true });
}
