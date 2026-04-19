import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendVerificationCode, checkVerificationCode } from '@/lib/twilio';

const PHONE_RE = /^\+[1-9]\d{6,14}$/;
const PHONE_TYPES = ['whatsapp', 'sms', 'phone', 'signal'];

/**
 * POST /api/channels/verify
 * Body: { action: 'send' | 'check', type: <phone-channel>, phone, code? }
 *
 * Twilio Verify OTP flow. On success marks the channel as verified.
 * Does not toggle visibility — the owner still picks an access_mode.
 */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { action, type, phone, code } = body ?? {};

  if (!PHONE_TYPES.includes(type)) {
    return NextResponse.json({ error: 'type is not a phone-backed channel.' }, { status: 400 });
  }
  if (!phone || !PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Phone must be E.164 format (e.g. +447911123456).' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  if (action === 'send') {
    try {
      await sendVerificationCode(phone);
    } catch (err) {
      console.error('Verify send error:', err);
      return NextResponse.json({ error: 'Failed to send verification code. Check Twilio configuration.' }, { status: 502 });
    }
    await supabase.from('channels').upsert(
      { user_id: user.id, type, value: phone, verified: false },
      { onConflict: 'user_id,type' }
    );
    return NextResponse.json({ ok: true });
  }

  if (action === 'check') {
    if (!code) return NextResponse.json({ error: 'code is required.' }, { status: 400 });
    let approved = false;
    try {
      approved = await checkVerificationCode(phone, code);
    } catch (err) {
      console.error('Verify check error:', err);
      return NextResponse.json({ error: 'Failed to check code. Try again.' }, { status: 502 });
    }
    if (!approved) {
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 422 });
    }
    await supabase.from('channels').upsert(
      { user_id: user.id, type, value: phone, verified: true },
      { onConflict: 'user_id,type' }
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'action must be send or check.' }, { status: 400 });
}
