import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { CHANNEL_META, CHANNEL_ORDER, ACCESS_LABEL } from '@/lib/channelMeta';
import MessageComposer from './MessageComposer';export async function generateMetadata({ params }) {
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

  // Pull every channel that could be visible to someone — we never expose
  // the raw value on this page; we only expose the channel type the viewer
  // can use to send a message through Hotname.
  const { data: channelRows } = await service
    .from('channels')
    .select('id, type, access_mode')
    .eq('user_id', profile.id)
    .neq('access_mode', 'hidden');

  // Existing request history for this viewer — show status chips inline
  let requestsByType = {};
  if (viewer) {
    const { data: reqs } = await service
      .from('connection_requests')
      .select('channel_type, status, created_at')
      .eq('owner_id', profile.id)
      .eq('requester_id', viewer.id)
      .order('created_at', { ascending: false });
    for (const r of reqs ?? []) {
      if (!requestsByType[r.channel_type]) requestsByType[r.channel_type] = r;
    }
  }

  // Decide which channels this viewer can see + which delivery mode applies.
  //   mode = 'direct'  → Public channel, message delivers immediately
  //   mode = 'allowed' → Invite channel and viewer is on the allowlist
  //   mode = 'approval'→ Request channel — message creates a pending request
  const channels = [];
  for (const ch of channelRows ?? []) {
    if (ch.access_mode === 'open') {
      channels.push({ type: ch.type, mode: 'direct' });
    } else if (ch.access_mode === 'request') {
      channels.push({ type: ch.type, mode: 'approval' });
    } else if (ch.access_mode === 'selected' && viewerUsername) {
      const { data: access } = await service
        .from('channel_access')
        .select('id')
        .eq('channel_id', ch.id)
        .eq('allowed_username', viewerUsername)
        .maybeSingle();
      if (access) channels.push({ type: ch.type, mode: 'allowed' });
    }
  }

  channels.sort(
    (a, b) => CHANNEL_ORDER.indexOf(a.type) - CHANNEL_ORDER.indexOf(b.type)
  );

  const initials = (profile.display_name || profile.username)
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="profile-page">
      <nav>
        <Link href="/"><span className="logo">hotname<span className="logo-dot" /></span></Link>
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

      {channels.length > 0 && (
        <div className="available-on">
          <span className="available-on-label">Available on</span>
          <div className="available-on-chips">
            {channels.map((ch) => {
              const meta = CHANNEL_META[ch.type];
              if (!meta) return null;
              const modeLabel =
                ch.mode === 'direct'   ? ACCESS_LABEL.open :
                ch.mode === 'allowed'  ? ACCESS_LABEL.selected :
                ch.mode === 'approval' ? ACCESS_LABEL.request :
                '';
              return (
                <span key={ch.type} className={`avail-chip avail-${ch.mode}`}>
                  {meta.label}
                  {modeLabel && <span className="avail-chip-mode">· {modeLabel}</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="request-box">
        {!viewer ? (
          <div className="auth-nudge">
            To reach @{profile.username}, <Link href={`/signup?next=/${profile.username}`}>create an account</Link> or{' '}
            <Link href={`/login?next=/${profile.username}`}>sign in</Link>. Hotname keeps their details private — messages are routed through us.
          </div>
        ) : viewer.id === profile.id ? (
          <div className="auth-nudge">
            This is your own profile. <Link href="/channels">Edit your channels →</Link>
          </div>
        ) : channels.length === 0 ? (
          <div className="empty">@{profile.username} isn&apos;t accepting messages right now.</div>
        ) : (
          <MessageComposer
            ownerUsername={profile.username}
            channels={channels}
            recentStatuses={requestsByType}
          />
        )}
      </div>

      <div className="profile-footer">
        <Link href="/">Powered by hotname · You never see their details.</Link>
      </div>
    </div>
  );
}
