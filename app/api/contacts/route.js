import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/contacts
 * Returns all contacts for the authenticated user, joined with profile info.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data, error } = await supabase
    .from('contacts')
    .select('id, contact_username, is_favorite, created_at, profiles!contacts_contact_username_fkey(display_name, phone_number)')
    .eq('user_id', user.id)
    .order('is_favorite', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data ?? [] });
}

/**
 * POST /api/contacts
 * Body: { contact_username: string }
 * Adds a contact (or returns existing).
 */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { contact_username } = body ?? {};
  if (!contact_username) return NextResponse.json({ error: 'contact_username is required.' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // Verify the contact exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', contact_username.toLowerCase())
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const { data, error } = await supabase
    .from('contacts')
    .upsert(
      { user_id: user.id, contact_username: profile.username },
      { onConflict: 'user_id,contact_username' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data });
}

/**
 * PATCH /api/contacts
 * Body: { contact_username: string, is_favorite: boolean }
 * Toggles a contact's favorite status.
 */
export async function PATCH(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { contact_username, is_favorite } = body ?? {};
  if (!contact_username || typeof is_favorite !== 'boolean') {
    return NextResponse.json({ error: 'contact_username and is_favorite are required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { error } = await supabase
    .from('contacts')
    .update({ is_favorite })
    .eq('user_id', user.id)
    .eq('contact_username', contact_username);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/contacts
 * Body: { contact_username: string }
 */
export async function DELETE(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { contact_username } = body ?? {};
  if (!contact_username) return NextResponse.json({ error: 'contact_username is required.' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('user_id', user.id)
    .eq('contact_username', contact_username);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
