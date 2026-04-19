import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { CHANNEL_META } from '@/lib/channelMeta';
import { sendSms, sendWhatsApp } from '@/lib/twilio';

const MAX_REASON = 500;

/**
 * POST /api/requests
 * Body: { owner_username, channel_type, reason }
 *
 * The viewer writes one message and picks a channel the owner has opened.
 * Access mode decides what happens next:
 *   open     (Public) → saved as approved, delivered immediately
 *   selected (Invite) → if viewer is on the allowlist, delivered immediately
 *   request  (Request)→ saved as pending, owner approves/declines in /requests
 *   hidden            → refused
 *
 * Response: { ok, delivered, status } so the composer can say "delivered" vs
 * "pending approval".
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
  const message = (reason ?? '').trim();
  if (!message) {
    return NextResponse.json({ error: 'Please write a message.' }, { status: 400 });
  }
  if (message.length > MAX_REASON) {
    return NextResponse.json({ error: `Message must be ${MAX_REASON} characters or fewer.` }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to send a message.' }, { status: 401 });

  const service = createServiceClient();

  const { data: requesterProfile } = await service
    .from('profiles').select('username').eq('id', user.id).maybeSingle();
  if (!requesterProfile) {
    return NextResponse.json({ error: 'Complete your profile first.' }, { status: 400 });
  }

  const { data: owner } = await service
    .from('profiles').select('id, username').eq('username', owner_username.toLowerCase()).maybeSingle();
  if (!owner) return NextResponse.json({ error: 'Hotname not found.' }, { status: 404 });

  const isSelf = owner.id === user.id;

  // Gate: there must be an accepted user-level connection between these two.
  // Self-messages bypass the gate (you don't need permission to DM yourself).
  if (!isSelf) {
    const { data: connection } = await service
      .from('user_connections')
      .select('status')
      .eq('requester_id', user.id)
      .eq('owner_id', owner.id)
      .maybeSingle();
    if (!connection || connection.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Request a connection first.', needs_connection: true },
        { status: 403 },
      );
    }
  }

  // 'In app' is a virtual channel — always available, no row in `channels`,
  // delivered straight to the owner's Hotname inbox.
  const isVirtual = CHANNEL_META[channel_type]?.virtual;
  let channel = null;
  let status = null;

  if (isVirtual) {
    status = 'approved';
  } else {
    const { data: ch } = await service
      .from('channels')
      .select('id, access_mode, value')
      .eq('user_id', owner.id)
      .eq('type', channel_type)
      .maybeSingle();
    if (!ch || ch.access_mode === 'hidden') {
      return NextResponse.json({ error: 'That channel is not available.' }, { status: 400 });
    }
    channel = ch;

    if (ch.access_mode === 'open') {
      status = 'approved';
    } else if (ch.access_mode === 'request') {
      status = 'pending';
    } else if (ch.access_mode === 'selected') {
      const { data: allow } = await service
        .from('channel_access')
        .select('id')
        .eq('channel_id', ch.id)
        .eq('allowed_username', requesterProfile.username)
        .maybeSingle();
      if (!allow) {
        return NextResponse.json({ error: 'This channel is invite-only.' }, { status: 403 });
      }
      status = 'approved';
    }
  }

  // Block duplicate pending requests for the same pair+channel
  if (status === 'pending') {
    const { data: existing } = await service
      .from('connection_requests')
      .select('id')
      .eq('owner_id', owner.id)
      .eq('requester_id', user.id)
      .eq('channel_type', channel_type)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'You already have a pending request for this channel.' }, { status: 409 });
    }
  }

  const nowIso = new Date().toISOString();
  const insertPayload = {
    requester_id: user.id,
    requester_username: requesterProfile.username,
    owner_id: owner.id,
    owner_username: owner.username,
    channel_type,
    reason: message,
    status,
  };
  if (status === 'approved') insertPayload.responded_at = nowIso;

  const { error: insertError } = await service.from('connection_requests').insert(insertPayload);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Try to deliver via Twilio when we auto-approved and the owner has a phone.
  // Skip for virtual channels (In app) and self-messages.
  let delivered = false;
  if (status === 'approved' && !isVirtual && !isSelf && channel?.value) {
    try {
      delivered = await deliverMessage(channel_type, channel.value, requesterProfile.username, message);
    } catch (err) {
      console.warn('[hotname] delivery skipped:', err?.message);
    }
  }

  return NextResponse.json({ ok: true, status, delivered });
}

/**
 * PATCH /api/requests
 * Body: { id, action: 'approve' | 'deny' | 'redirect', redirect_to? }
 * Owner only.
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
    .select('id, owner_id, channel_type, requester_id, requester_username, reason')
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

  // On approve: deliver the stored message to the owner's channel target.
  if (action === 'approve') {
    const { data: channel } = await service
      .from('channels')
      .select('value')
      .eq('user_id', req.owner_id)
      .eq('type', req.channel_type)
      .maybeSingle();

    if (channel?.value && req.reason) {
      try {
        await deliverMessage(req.channel_type, channel.value, req.requester_username, req.reason);
      } catch (err) {
        console.warn('[hotname] delivery skipped:', err?.message);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * Deliver a message to `target` through the given channel.
 * Right now only WhatsApp + SMS are wired up through Twilio — everything else
 * is stored in the owner's /requests inbox for them to see.
 * Returns true when an external delivery actually happened.
 */
async function deliverMessage(channelType, target, senderUsername, message) {
  const meta = CHANNEL_META[channelType];
  if (!meta || !target) return false;

  const body = `From @${senderUsername} via Hotname:\n\n${message}`;

  if (channelType === 'whatsapp') {
    await sendWhatsApp(target, body);
    return true;
  }
  if (channelType === 'sms') {
    await sendSms(target, body);
    return true;
  }
  // Email / telegram / instagram / website / booking / phone / signal
  // — no direct transport from the server yet. The message lives in the
  // owner's /requests inbox as the `reason` field so they can follow up.
  return false;
}
