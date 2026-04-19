import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { CHANNEL_META, CHANNEL_ORDER, ACCESS_LABEL } from '@/lib/channelMeta';
import MessageComposer from './MessageComposer';
import ConnectForm from './ConnectForm';
import Logo from '@/app/components/Logo';export async function generateMetadata({ params }) {
  const { username } = await params;
  return {
    title: `@${username} — Hotname`,
    description: `Reach @${username} through Hotname.`,
  };
}

export default async function ProfilePage({ params }) {
  const { username } = await params;
  const handle = username.toLowerCase();

  const supabase = await createClient();
  const service  = createServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('id, username, display_name, bio, location, verified')
    .eq('username', handle)
    .maybeSingle();

  if (!profile) notFound();

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

  // Pull every channel that could be visible. For Public channels we also
  // pull the raw value so the chip can be clickable (mailto, Instagram URL,
  // website, etc.). For Request / Invite the value is never sent to the
  // client.
  const { data: channelRows } = await service
    .from('channels')
    .select('id, type, value, access_mode')
    .eq('user_id', profile.id)
    .neq('access_mode', 'hidden');

  // Existing request history for this viewer — show status chips inline
  let requestsByType = {};
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

  const isSelf = viewer && viewer.id === profile.id;
  const connectionStatus = isSelf ? 'self' : (connection?.status ?? null);
  // Self can always message themselves (goes to their own inbox).
  const canMessage = isSelf || connectionStatus === 'accepted';

  // Decide which channels this viewer can see + which delivery mode applies.
  //   mode = 'direct'  → Public channel, message delivers immediately
  //   mode = 'allowed' → Invite channel and viewer is on the allowlist
  // Channels that aren't toggled (access_mode === 'hidden') never show.
  const channels = [];
  for (const ch of channelRows ?? []) {
    const meta = CHANNEL_META[ch.type];
    // Channels flagged privateValue (e.g. Post / postal address) never expose
    // their raw value to the client — Hotname routes messages through them
    // server-side.
    const safeValue = meta?.privateValue ? null : (ch.value ?? null);

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

  // The composer only offers channels Hotname can actually route a message
  // through (WhatsApp / SMS / Email / Post). Everything else (Instagram,
  // Website, Telegram, etc. when Public) just lives as a clickable chip above.
  const composerChannels = channels.filter((c) => CHANNEL_META[c.type]?.deliverable);

  // 'In app' is virtual: always available, goes to the owner's Hotname
  // inbox. Prepend it so it's the default choice.
  composerChannels.unshift({ type: 'inapp', mode: 'direct' });

  const initials = (profile.display_name || profile.username)
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="profile-page">
      <nav>
        <Link href="/"><Logo /></Link>
        <div className="nav-actions">
          {viewer ? (
            <Link href="/dashboard"><button className="btn-ghost">Dashboard</button></Link>
          ) : (
            <>
              <Link href="/login"><button className="btn-ghost">Log in</button></Link>
              <Link href="/signup"><button className="btn-primary">Claim yours</button></Link>
            </>
          )}
        </div>
      </nav>

      <section className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <h1 className="profile-name">{profile.display_name || profile.username}</h1>
        <p className="profile-handle">@{profile.username}</p>
        {profile.bio && <p className="profile-status">{profile.bio}</p>}
        {(profile.verified || profile.location) && (
          <div className="trust-chips">
            {profile.verified && <span className="trust-chip">✓ Verified</span>}
            {profile.location && (
              <span
                className="trust-chip"
                style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                {profile.location}
              </span>
            )}
          </div>
        )}
      </section>

      {channels.length > 0 && (() => {
        // Split by intent, not by 'has a link':
        //   Message → anything Hotname can route a message to (WhatsApp, SMS,
        //             Email, Post).
        //   Links   → everything else (Instagram, Website, Telegram, Signal,
        //             Voice call, Booking) — places you go, not message to.
        const linkChannels = [];
        const messageChannels = [];
        for (const ch of channels) {
          const meta = CHANNEL_META[ch.type];
          if (!meta) continue;
          if (meta.deliverable) messageChannels.push(ch);
          else linkChannels.push(ch);
        }

        return (
          <div className="available-sections">
            {linkChannels.length > 0 && (
              <div className="available-on">
                <span className="available-on-label">Links</span>
                <div className="available-on-chips">
                  {linkChannels.map((ch) => {
                    const meta = CHANNEL_META[ch.type];
                    const canLinkOut =
                      (ch.mode === 'direct' || ch.mode === 'allowed') &&
                      ch.value &&
                      typeof meta.valueToLink === 'function';
                    if (canLinkOut) {
                      const href = meta.valueToLink(ch.value);
                      const opensExternal = meta.kind === 'url' || meta.kind === 'handle';
                      return (
                        <a
                          key={ch.type}
                          href={href}
                          target={opensExternal ? '_blank' : undefined}
                          rel={opensExternal ? 'noopener noreferrer' : undefined}
                          className={`avail-chip avail-${ch.mode} avail-clickable`}
                        >
                          {meta.label}
                        </a>
                      );
                    }
                    return (
                      <span key={ch.type} className={`avail-chip avail-${ch.mode}`}>
                        {meta.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {messageChannels.length > 0 && (
              <div className="available-on">
                <span className="available-on-label">Message</span>
                <div className="available-on-chips">
                  {messageChannels.map((ch) => {
                    const meta = CHANNEL_META[ch.type];
                    return (
                      <span key={ch.type} className={`avail-chip avail-${ch.mode}`}>
                        {meta.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div className="request-box">
        {canMessage ? (
          composerChannels.length === 0 ? (
            <div className="empty">
              {isSelf
                ? 'Open a channel on /channels to see the composer here.'
                : `@${profile.username} hasn't opened any message channels.`}
            </div>
          ) : (
            <MessageComposer
              ownerUsername={profile.username}
              channels={composerChannels}
              recentStatuses={requestsByType}
              viewerLoggedIn={!!viewer}
              isSelf={isSelf}
            />
          )
        ) : (
          <ConnectForm
            ownerUsername={profile.username}
            viewerLoggedIn={!!viewer}
            status={connectionStatus}
          />
        )}
      </div>

      {isSelf && (
        <div className="self-banner self-banner-footer">
          <span>This is your own profile — preview of what others see.</span>
          <Link href="/channels" style={{ color: 'var(--accent-text)', fontSize: '12px' }}>
            Edit channels →
          </Link>
        </div>
      )}

      <div className="profile-footer">
        <Link href="/">Powered by hotname · You never see their details.</Link>
      </div>
    </div>
  );
}
