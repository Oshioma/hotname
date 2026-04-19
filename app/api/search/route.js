import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const MIN_LENGTH = 2;
const LIMIT = 10;

/**
 * GET /api/search?q=<query>
 * Returns up to 10 profiles whose username or display_name matches the query.
 * Username prefix match ranks first; display_name substring match follows.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get('q') ?? '').trim().replace(/^@/, '');
  if (raw.length < MIN_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  // Escape ilike wildcards so the user's input is treated as literal.
  const escaped = raw.replace(/[%_]/g, (m) => `\\${m}`).toLowerCase();

  const service = createServiceClient();
  const { data, error } = await service
    .from('profiles')
    .select('username, display_name, bio, verified')
    .or(`username.ilike.${escaped}%,display_name.ilike.%${escaped}%`)
    .limit(LIMIT);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Prefix matches first, then alphabetical.
  const sorted = (data ?? []).sort((a, b) => {
    const aPrefix = a.username.startsWith(escaped) ? 0 : 1;
    const bPrefix = b.username.startsWith(escaped) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return a.username.localeCompare(b.username);
  });

  return NextResponse.json({ results: sorted });
}
