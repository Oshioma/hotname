import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/thread/[thread_id]
 * Returns all messages in this thread that the authenticated user is a participant of.
 * Also returns the "other person" username for routing a reply (never exposing their identity
 * beyond what the user already knows — they sent TO that person or received FROM them).
 */
export async function GET(request, { params }) {
  const { thread_id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // Fetch user's own profile username
  const { data: me } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (!me) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });

  // Fetch all thread messages the user can see (RLS enforces participant-only access)
  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, thread_id, parent_id, sender_id, recipient_username, body, channel, created_at')
    .eq('thread_id', thread_id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  // Determine the other participant (for routing the reply)
  // We derive this from message direction, never exposing identity to the wrong party.
  const myUsername = me.username;
  let replyToUsername = null;

  for (const msg of messages) {
    if (msg.recipient_username === myUsername && msg.sender_id) {
      // I received this message — reply goes to the sender
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', msg.sender_id)
        .single();
      replyToUsername = senderProfile?.username ?? null;
      break;
    }
    if (msg.sender_id === user.id) {
      // I sent this message — reply is addressed back to the recipient
      replyToUsername = msg.recipient_username;
      break;
    }
  }

  // Annotate messages with direction so the UI can style them
  const annotated = messages.map((msg) => ({
    ...msg,
    direction: msg.sender_id === user.id ? 'sent' : 'received',
    // Never expose sender_id or raw IDs to the client
    sender_id: undefined,
  }));

  return NextResponse.json({
    thread_id,
    messages: annotated,
    reply_to_username: replyToUsername,
    my_username: myUsername,
    can_reply: replyToUsername !== null,
  });
}
