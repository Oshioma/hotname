import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { CHANNEL_META, CHANNEL_ORDER } from '@/lib/channelMeta';

/**
 * Everything a viewer is allowed to see about one Hotname, as plain JSON.
 * Shared by the profile page (/[username]) and the home-page inline search
 * (/api/lookup), so both show exactly the same thing.
 *
 * Returns null when the Hotname doesn't exist.
 *
 * Visibility rules (set by the owner on /channels):
 *   open     (Public) → everyone sees the channel AND its contact detail
 *   selected (Invite) → only allow-listed usernames see it (with its detail)
 *   hidden   (Off)    → never shown
 * Channels flagged privateValue (Post) never send their raw value anywhere.
 */
export async function loadProfileView(username) {
  const handle = String(username ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!handle) return null;

  const supabase = await createClient();
  const service  = createServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('id, username, display_name, bio, location, verified')
    .eq('username', handle)
    .maybeSingle();

  if (!profile) return null;

  const { data: { user: viewer } } = await supabase.auth.getUser();
  let viewerUsername = null;
  if (viewer) {
    const { data: vp } = await service
      .from('profiles')
      .select('username')
      .eq('id', viewer.id)
      .maybeSingle();
    viewerUsername = vp?.username ?? null;
  }

  const { data: channelRows } = await service
    .from('channels')
    .select('id, type, value, access_mode')
    .eq('user_id', profile.id)
    .neq('access_mode', 'hidden');

  // Existing request history for this viewer — show status chips inline
  const requestsByType = {};
  let connection = null;
  if (viewer) {
    const [reqsResult, connResult] = await Promise.all([
      service
        .from('connection_requests')
        .select('channel_type, status, created_at')
        .eq('owner_id', profile.id)
        .eq('requester_id', viewer.id)
        .order('created_at', { ascending: false }),
      service
        .from('user_connections')
        .select('id, status, created_at')
        .eq('requester_id', viewer.id)
        .eq('owner_id', profile.id)
        .maybeSingle(),
    ]);
    for (const r of reqsResult.data ?? []) {
      if (!requestsByType[r.channel_type]) requestsByType[r.channel_type] = r;
    }
    connection = connResult.data ?? null;
  }

  const isSelf = !!viewer && viewer.id === profile.id;
  const connectionStatus = isSelf ? 'self' : (connection?.status ?? null);
  // Self can always message themselves (goes to their own inbox).
  const canMessage = isSelf || connectionStatus === 'accepted';

  // Which channels this viewer can see:
  //   mode = 'direct'  → Public channel — detail visible to everyone
  //   mode = 'allowed' → Invite channel and viewer is on the allowlist
  const channels = [];
  for (const ch of channelRows ?? []) {
    const meta = CHANNEL_META[ch.type];
    if (!meta) continue;
    const safeValue = meta.privateValue ? null : (ch.value ?? null);

    if (ch.access_mode === 'open') {
      channels.push({ type: ch.type, mode: 'direct', value: safeValue });
    } else if (ch.access_mode === 'selected' && viewerUsername) {
      const { data: access } = await service
        .from('channel_access')
        .select('id')
        .eq('channel_id', ch.id)
        .eq('allowed_username', viewerUsername)
        .maybeSingle();
      if (access) channels.push({ type: ch.type, mode: 'allowed', value: safeValue });
    }
  }

  channels.sort(
    (a, b) => CHANNEL_ORDER.indexOf(a.type) - CHANNEL_ORDER.indexOf(b.type)
  );

  // The composer only offers channels Hotname can route a message through.
  // 'In app' is virtual and always available, so it's the default choice.
  const composerChannels = [
    { type: 'inapp', mode: 'direct' },
    ...channels
      .filter((c) => CHANNEL_META[c.type]?.deliverable)
      .map(({ type, mode }) => ({ type, mode })),
  ];

  return {
    profile: {
      username: profile.username,
      display_name: profile.display_name,
      bio: profile.bio,
      location: profile.location,
      verified: !!profile.verified,
    },
    channels,
    composerChannels,
    requestsByType,
    connectionStatus,
    canMessage,
    isSelf,
    viewerLoggedIn: !!viewer,
  };
}
