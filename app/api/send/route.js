import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_BODY_LENGTH = 500;

/**
 * POST /api/send
 * Body: { recipient_username: string, body: string, platform?: string }
 */
export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { recipient_username, body, platform } = payload ?? {};

  // Input validation
  if (!recipient_username || typeof recipient_username !== 'string') {
    return NextResponse.json({ error: 'recipient_username is required.' }, { status: 400 });
  }
  if (!body || typeof body !== 'string') {
    return NextResponse.json({ error: 'body is required.' }, { status: 400 });
  }
  const trimmedBody = body.trim();
  if (trimmedBody.length === 0) {
    return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
  }
  if (trimmedBody.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: `Message must be ${MAX_BODY_LENGTH} characters or fewer.` }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify recipient exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', recipient_username.toLowerCase())
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const { error } = await supabase.from('messages').insert({
    recipient_username: recipient_username.toLowerCase(),
    body: trimmedBody,
    platform: platform ?? 'General',
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to save message.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
