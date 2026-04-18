import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TYPES = ['whatsapp', 'sms', 'email', 'post'];
const PHONE_RE = /^\+[1-9]\d{6,14}$/;

/**
 * GET /api/channels
 * Returns all 4 channel rows for the authenticated user (creates defaults if missing).
 * Includes the access list per channel.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // Fetch (or default) all 4 channel rows
  const { data: rows } = await supabase
    .from('channels')
    .select('id, type, enabled, verified, value, default_access')
    .eq('user_id', user.id);

  const existing = Object.fromEntries((rows ?? []).map((r) => [r.type, r]));

  // Fetch access lists for all channel ids
  const channelIds = (rows ?? []).map((r) => r.id);
  let accessRows = [];
  if (channelIds.length) {
    const { data } = await supabase
      .from('channel_access')
      .select('channel_id, allowed_username')
      .in('channel_id', channelIds);
    accessRows = data ?? [];
  }

  const accessByChannel = {};
  for (const a of accessRows) {
    if (!accessByChannel[a.channel_id]) accessByChannel[a.channel_id] = [];
    accessByChannel[a.channel_id].push(a.allowed_username);
  }

  const channels = TYPES.map((type) => {
    const row = existing[type] ?? { id: null, type, enabled: false, verified: false, value: null, default_access: 'everyone' };
    return {
      ...row,
      access_list: row.id ? (accessByChannel[row.id] ?? []) : [],
    };
  });

  return NextResponse.json({ channels });
}

/**
 * PATCH /api/channels
 * Body: { type, enabled?, value?, default_access?, verified? }
 * Upserts the channel row. Clears verified if value changes.
 */
export async function PATCH(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { type, enabled, value, default_access, verified } = body ?? {};

  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid channel type.' }, { status: 400 });
  }

  if ((type === 'whatsapp' || type === 'sms') && value !== undefined && value !== null && value !== '') {
    if (!PHONE_RE.test(value)) {
      return NextResponse.json({ error: 'Phone must be E.164 format (e.g. +447911123456).' }, { status: 400 });
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // Fetch current row to detect value change (clears verification)
  const { data: current } = await supabase
    .from('channels')
    .select('value, verified')
    .eq('user_id', user.id)
    .eq('type', type)
    .maybeSingle();

  const updates = { user_id: user.id, type };
  if (enabled !== undefined) updates.enabled = enabled;
  if (value !== undefined) {
    updates.value = value || null;
    if (current?.value !== value) updates.verified = false;
  }
  if (default_access !== undefined) updates.default_access = default_access;
  if (verified !== undefined) updates.verified = verified;

  const { error } = await supabase
    .from('channels')
    .upsert(updates, { onConflict: 'user_id,type' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
