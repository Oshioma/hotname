import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/user-lookup?username=:username
 * Returns basic profile info for a given username (public data only).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username')?.toLowerCase().trim();

  if (!username) {
    return NextResponse.json({ error: 'username is required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, phone_number')
    .eq('username', username)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  // Only expose whether phone_number exists, not the actual number
  return NextResponse.json({
    profile: {
      username: profile.username,
      display_name: profile.display_name,
      phone_number: profile.phone_number ? '••••' : null,
    },
  });
}
