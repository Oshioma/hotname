import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendSms, sendWhatsApp } from '@/lib/twilio';

const MAX_BODY = 500;

/**
 * POST /api/send-message
 * Body: {
 *   to_username: string,
 *   body: string,
 *   channel?: 'sms' | 'whatsapp' | 'app',
 *   thread_id?: string,   // omit to start a new thread
 *   parent_id?: string,   // id of the message being replied to
 * }
 */
export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { to_username, body, channel = 'app', thread_id, parent_id } = payload ?? {};

  if (!to_username || typeof to_username !== 'string') {
    return NextResponse.json({ error: 'to_username is required.' }, { status: 400 });
  }
  if (!body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'Message body is required.' }, { status: 400 });
  }
  if (body.trim().length > MAX_BODY) {
    return NextResponse.json({ error: `Message must be ${MAX_BODY} characters or fewer.` }, { status: 400 });
  }
  if (!['sms', 'whatsapp', 'app', 'post'].includes(channel)) {
    return NextResponse.json({ error: 'channel must be sms, whatsapp, app, or post.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: recipient } = await supabase
    .from('profiles')
    .select('id, username, phone_number, display_name')
    .eq('username', to_username.toLowerCase())
    .maybeSingle();

  if (!recipient) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const trimmedBody = body.trim();

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
        { error: 'Failed to send via Twilio. Check your configuration.' },
        { status: 502 }
      );
    }
  }

  const insert = {
    sender_id: user.id,
    recipient_username: recipient.username,
    body: trimmedBody,
    channel,
    platform: channel === 'sms' ? 'SMS' : channel === 'whatsapp' ? 'WhatsApp' : channel === 'post' ? 'Post' : 'App',
  };
  if (thread_id) insert.thread_id = thread_id;
  if (parent_id) insert.parent_id = parent_id;

  const { data: saved, error: dbError } = await supabase
    .from('messages')
    .insert(insert)
    .select('id, thread_id')
    .single();

  if (dbError) {
    console.error('DB insert error:', dbError);
    return NextResponse.json({ error: 'Message sent but could not be logged.' }, { status: 500 });
  }

  // Auto-save contact
  await supabase
    .from('contacts')
    .upsert(
      { user_id: user.id, contact_username: recipient.username },
      { onConflict: 'user_id,contact_username', ignoreDuplicates: true }
    );

  return NextResponse.json({ ok: true, thread_id: saved.thread_id, message_id: saved.id });
}
