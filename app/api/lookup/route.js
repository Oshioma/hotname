import { NextResponse } from 'next/server';
import { loadProfileView } from '@/lib/profileView';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lookup?u=<username>
 * The same view of a Hotname that /<username> renders, as JSON — used by the
 * home-page search to open a profile inline. Only returns what this viewer is
 * allowed to see (Public details for everyone, Invite details for the
 * allowlist, never Post addresses).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const u = searchParams.get('u') ?? '';
  if (!u.trim()) return NextResponse.json({ error: 'u is required.' }, { status: 400 });

  const view = await loadProfileView(u);
  if (!view) return NextResponse.json({ error: 'Hotname not found.' }, { status: 404 });

  return NextResponse.json(view, { headers: { 'Cache-Control': 'no-store' } });
}
