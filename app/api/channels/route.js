import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  CHANNEL_META,
  CHANNEL_ORDER,
  ACCESS_MODES,
  normaliseChannelValue,
  validateChannelValue,
} from '@/lib/channelMeta';

/**
 * GET /api/channels
 * Returns all channel rows for the authenticated user, in canonical order.
 * Includes the access list per channel.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from('channels')
      .select('id, type, value, verified, access_mode')
      .eq('user_id', user.id),
    supabase
      .from('profiles')
      .select('phone_number, email')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const existing = Object.fromEntries((rows ?? []).map((r) => [r.type, r]));

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

  const channels = CHANNEL_ORDER.map((type) => {
    const row = existing[type] ?? {
      id: null,
      type,
      value: null,
      verified: false,
      access_mode: 'hidden',
    };
    return {
      ...row,
      access_list: row.id ? (accessByChannel[row.id] ?? []) : [],
      kind: CHANNEL_META[type].kind,
      label: CHANNEL_META[type].label,
      hint: CHANNEL_META[type].hint,
    };
  });

  const profileDefaults = {
    phone: profile?.phone_number ?? null,
    email: profile?.email ?? null,
  };

  return NextResponse.json({ channels, profileDefaults });
}

/**
 * PATCH /api/channels
 * Body: { type, value?, access_mode? }
 * Upserts the channel row.
 * Clears `verified` if value changes.
 */
export async function PATCH(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { type, value: rawValue, access_mode } = body ?? {};

  if (!CHANNEL_META[type]) {
    return NextResponse.json({ error: 'Invalid channel type.' }, { status: 400 });
  }
  if (access_mode !== undefined && !ACCESS_MODES.includes(access_mode)) {
    return NextResponse.json({ error: 'Invalid access_mode.' }, { status: 400 });
  }

  // Normalise then validate so users can type 07951… or www.foo.com
  const value =
    rawValue !== undefined && rawValue !== null && rawValue !== ''
      ? normaliseChannelValue(type, rawValue)
      : rawValue;

  if (value !== undefined && value !== null && value !== '') {
    const validationError = validateChannelValue(type, value);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Block setting access_mode away from 'hidden' without a value.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: current } = await supabase
    .from('channels')
    .select('value, verified')
    .eq('user_id', user.id)
    .eq('type', type)
    .maybeSingle();

  const nextValue =
    value !== undefined ? (value || null) : (current?.value ?? null);
  const nextMode =
    access_mode !== undefined ? access_mode : null;

  if (nextMode && nextMode !== 'hidden' && !nextValue) {
    return NextResponse.json(
      { error: `Add a ${CHANNEL_META[type].label} detail before making this channel visible.` },
      { status: 400 },
    );
  }

  const updates = { user_id: user.id, type };
  if (value !== undefined) {
    updates.value = value || null;
    if (current?.value !== value) updates.verified = false;
  }
  if (access_mode !== undefined) updates.access_mode = access_mode;

  const { error } = await supabase
    .from('channels')
    .upsert(updates, { onConflict: 'user_id,type' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
