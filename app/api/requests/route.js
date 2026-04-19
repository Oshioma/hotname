import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { CHANNEL_META } from '@/lib/channelMeta';
import { sendSms, sendWhatsApp } from '@/lib/twilio';

const MAX_REASON = 300;

/**
 * POST /api/requests
 * Body: { owner_username, channel_type, reason }
 * Creates a connection request. Requester must be authenticated.
 */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { owner_username, channel_type, reason } = body ?? {};

  if (!owner_username || typeof owner_username !== 'string') {
    return NextResponse.json({ error: 'owner_username is required.' }, { status: 400 });
  }
  if (!channel_type || !CHANNEL_META[channel_type]) {
    return NextResponse.json({ error: 'Unknown channel type.' }, { status: 400 });
  }
  const trimmedReason = (reason ?? '').trim();
  if (!trimmedReason) {
    return NextResponse.json({ error: 'Please say why you want to connect.' }, { status: 400 });
  }
  if (trimmedReason.length > MAX_REASON) {
    return NextResponse.json({ error: `Reason must be ${MAX_REASON} characters or fewer.` }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to request a connection.' }, { status: 401 });

  const service = createServiceClient();

  const { data: requesterProfile } = await service
    .from('profiles').select('username').eq('id', user.id).maybeSingle();
  if (!requesterProfile) {
    return NextResponse.json({ error: 'Complete your profile before requesting.' }, { status: 400 });
  }

  const { data: owner } = await service
    .from('profiles').select('id, username').eq('username', owner_username.toLowerCase()).maybeSingle();
  if (!owner) return NextResponse.json({ error: 'Hotname not found.' }, { status: 404 });

  if (owner.id === user.id) {
    return NextResponse.json({ error: 'You cannot request your own profile.' }, { status: 400 });
  }

  // Owner must have that channel in 'request' mode
  const { data: channel } = await service
    .from('channels')
    .select('access_mode')
    .eq('user_id', owner.id)
    .eq('type', channel_type)
    .maybeSingle();
  if (!channel || channel.access_mode !== 'request') {
    return NextResponse.json({ error: 'That channel is not open to requests.' }, { status: 400 });
  }

  // Block if there is already a pending request for this pair+channel
  const { data: existing } = await service
    .from('connection_requests')
    .select('id, status')
    .eq('owner_id', owner.id)
    .eq('requester_id', user.id)
    .eq('channel_type', channel_type)
    .eq('status', 'pending')
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'You already have a pending request for this channel.' }, { status: 409 });
  }

  const { error } = await service.from('connection_requests').insert({
    requester_id: user.id,
    requester_username: requesterProfile.username,
    owner_id: owner.id,
    owner_username: owner.username,
    channel_type,
    reason: trimmedReason,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/requests
 * Body: { id, action: 'approve' | 'deny' | 'redirect', redirect_to? }
 * Owner only.
 *
 * On approve, we optionally trigger Twilio delivery: when the owner's
 * requested channel is whatsapp/sms, we send the requester a short
 * notice with the raw channel value so they can reach out directly.
 * If Twilio is not configured we silently skip delivery.
 */
export async function PATCH(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  const { id, action, redirect_to } = body ?? {};
  if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
  if (!['approve', 'deny', 'redirect'].includes(action)) {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
  if (action === 'redirect' && !CHANNEL_META[redirect_to]) {
    return NextResponse.json({ error: 'redirect_to must be a valid channel.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const service = createServiceClient();

  const { data: req } = await service
    .from('connection_requests')
    .select('id, owner_id, channel_type, requester_id')
    .eq('id', id)
    .maybeSingle();
  if (!req) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (req.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your request.' }, { status: 403 });
  }

  const update = { responded_at: new Date().toISOString() };
  if (action === 'approve')  update.status = 'approved';
  if (action === 'deny')     update.status = 'denied';
  if (action === 'redirect') { update.status = 'redirected'; update.redirected_to = redirect_to; }

  const { error } = await service
    .from('connection_requests')
    .update(update)
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort Twilio delivery when approving phone-backed channels.
  if (action === 'approve') {
    try {
      await notifyRequester(service, req.owner_id, req.requester_id, req.channel_type);
    } catch (err) {
      // Delivery failure should not fail the approval.
      console.warn('[hotname] Twilio delivery skipped:', err?.message);
    }
  }

  return NextResponse.json({ ok: true });
}

async function notifyRequester(service, ownerId, requesterId, channelType) {
  // Only wire Twilio for phone-backed channels where we can reach the requester.
  const meta = CHANNEL_META[channelType];
  if (!meta) return;

  const { data: owner } = await service
    .from('profiles').select('username').eq('id', ownerId).maybeSingle();
  if (!owner) return;

  const { data: requester } = await service
    .from('profiles').select('phone_number').eq('id', requesterId).maybeSingle();
  if (!requester?.phone_number) return;

  const msg =
    `Hotname: @${owner.username} approved your request for ${meta.label}. ` +
    `Open their profile to see the details.`;

  if (channelType === 'whatsapp') {
    await sendWhatsApp(requester.phone_number, msg);
  } else {
    await sendSms(requester.phone_number, msg);
  }
}
