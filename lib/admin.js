/**
 * Admin gate.
 * HOTNAME_ADMIN_IDS is a comma-separated list of Supabase auth user uuids.
 * The value is read server-side only (no NEXT_PUBLIC_ prefix).
 */
export function isAdmin(userId) {
  if (!userId) return false;
  const raw = process.env.HOTNAME_ADMIN_IDS ?? '';
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.includes(userId);
}
