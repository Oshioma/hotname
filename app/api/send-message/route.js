import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendSms, sendWhatsApp } from '@/lib/twilio';

const MAX_BODY = 500;

/**
 * POST /api/send-message
 * Body: { to_username: string, body: string, channel: 'sms' | 'whatsapp' | 'app' }
 *
 * Looks up the recipient's phone number by hotname, sends via Twilio (sms/whatsapp),
 * and logs the message in the messages table.
 */
export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { to_username, body, channel = 'app' } = payload ?? {};

  if (!to_username || typeof to_username !== 'string') {
    return NextResponse.json({ error: 'to_username is required.' }, { status: 400 });
  }
  if (!body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'Message body is required.' }, { status: 400 });
  }
  if (body.trim().length > MAX_BODY) {
    return NextResponse.json({ error: `Message must be ${MAX_BODY} characters or fewer.` }, { status: 400 });
  }
  if (!['sms', 'whatsapp', 'app'].includes(channel)) {
    return NextResponse.json({ error: 'channel must be sms, whatsapp, or app.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Look up recipient profile
  const { data: recipient } = await supabase
    .from('profiles')
    .select('id, username, phone_number, display_name')
    .eq('username', to_username.toLowerCase())
    .maybeSingle();

  if (!recipient) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const trimmedBody = body.trim();

  // Send via Twilio for sms/whatsapp channels
  if (channel === 'sms' || channel === 'whatsapp') {
    if (!recipient.phone_number) {
      return NextResponse.json(
        { error: `@${recipient.username} has not added a phone number.` },
        { status: 422 }
      );
    }

    try {
      if (channel === 'sms') {
        await sendSms(recipient.phone_number, trimmedBody);
      } else {
        await sendWhatsApp(recipient.phone_number, trimmedBody);
      }
    } catch (err) {
      console.error('Twilio send error:', err);
      return NextResponse.json(
        { error: 'Failed to send message via Twilio. Check your configuration.' },
        { status: 502 }
      );
    }
  }

  // Log to database
  const { error: dbError } = await supabase.from('messages').insert({
    sender_id: user.id,
    recipient_username: recipient.username,
    body: trimmedBody,
    channel,
    platform: channel === 'sms' ? 'SMS' : channel === 'whatsapp' ? 'WhatsApp' : 'App',
  });

  if (dbError) {
    console.error('DB insert error:', dbError);
    return NextResponse.json({ error: 'Message sent but could not be logged.' }, { status: 500 });
  }

  // Auto-save sender's contact if not already saved
  await supabase
    .from('contacts')
    .upsert(
      { user_id: user.id, contact_username: recipient.username },
      { onConflict: 'user_id,contact_username', ignoreDuplicates: true }
    );

  return NextResponse.json({ ok: true });
}
