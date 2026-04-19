import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { CHANNEL_META, CHANNEL_ORDER, ACCESS_LABEL } from '@/lib/channelMeta';
import RequestForm from './RequestForm';

export async function generateMetadata({ params }) {
  const { username } = await params;
  return {
    title: `@${username} — Hotname`,
    description: `Reach @${username} through the channels they choose.`,
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

  // Channels: fetch all non-hidden, decide access per-viewer
  const { data: channelRows } = await service
    .from('channels')
    .select('id, type, value, access_mode')
    .eq('user_id', profile.id)
    .neq('access_mode', 'hidden');

  // Existing request (if viewer is logged in) — to show current status per channel
  let requestsByType = {};
  if (viewer) {
    const { data: reqs } = await service
      .from('connection_requests')
      .select('channel_type, status, redirected_to, created_at')
      .eq('owner_id', profile.id)
      .eq('requester_id', viewer.id)
      .order('created_at', { ascending: false });
    for (const r of reqs ?? []) {
      if (!requestsByType[r.channel_type]) requestsByType[r.channel_type] = r;
    }
  }

  const channels = [];
  for (const ch of channelRows ?? []) {
    let visible = ch.access_mode === 'open' || ch.access_mode === 'request';
    let revealValue = ch.access_mode === 'open';

    if (ch.access_mode === 'selected' && viewerUsername) {
      const { data: access } = await service
        .from('channel_access')
        .select('id')
        .eq('channel_id', ch.id)
        .eq('allowed_username', viewerUsername)
        .maybeSingle();
      if (access) { visible = true; revealValue = true; }
    }

    // Approved request unlocks the raw value as if it were `open`.
    const req = requestsByType[ch.type];
    if (req?.status === 'approved') revealValue = true;

    if (visible) channels.push({ ...ch, revealValue, request: req ?? null });
  }

  // Keep canonical channel order
  channels.sort(
    (a, b) => CHANNEL_ORDER.indexOf(a.type) - CHANNEL_ORDER.indexOf(b.type)
  );

  const requestableChannels = channels.filter(
    (c) => c.access_mode === 'request' && !c.revealValue
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
            {profile.location && <span className="trust-chip" style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{profile.location}</span>}
          </div>
        )}
      </section>

      {channels.length === 0 ? (
        <div className="empty" style={{ marginTop: '1rem' }}>
          @{profile.username} hasn&apos;t opened any channels yet.
        </div>
      ) : (
        <div className="channel-list">
          {channels.map((ch) => {
            const meta = CHANNEL_META[ch.type];
            if (!meta) return null;
            const badgeClass = ch.revealValue ? 'open' : ch.access_mode;
            const badgeLabel = ch.revealValue ? 'Public' : ACCESS_LABEL[ch.access_mode];

            if (ch.revealValue && ch.value) {
              return (
                <a
                  key={ch.type}
                  className="channel-row clickable"
                  href={meta.valueToLink(ch.value)}
                  target={meta.kind === 'url' || meta.kind === 'handle' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                >
                  <div>
                    <div className="channel-row-label">{meta.label}</div>
                    <div className="channel-row-hint">{ch.value}</div>
                  </div>
                  <span className={`access-badge ${badgeClass}`}>{badgeLabel}</span>
                </a>
              );
            }

            return (
              <div key={ch.type} className="channel-row">
                <div>
                  <div className="channel-row-label">{meta.label}</div>
                  <div className="channel-row-hint">
                    {ch.request?.status === 'pending'  && 'Request pending'}
                    {ch.request?.status === 'denied'   && 'Request declined'}
                    {ch.request?.status === 'redirected' && `Redirected → ${CHANNEL_META[ch.request.redirected_to]?.label ?? ch.request.redirected_to}`}
                    {!ch.request && meta.hint}
                  </div>
                </div>
                <span className={`access-badge ${ch.request ? ch.request.status : badgeClass}`}>
                  {ch.request?.status === 'pending'  ? 'Pending'
                    : ch.request?.status === 'denied' ? 'Declined'
                    : ch.request?.status === 'redirected' ? 'Redirected'
                    : badgeLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Request connection */}
      <div className="request-box">
        {!viewer ? (
          <div className="auth-nudge">
            To request a connection, <Link href={`/signup?next=/${profile.username}`}>create an account</Link> or{' '}
            <Link href={`/login?next=/${profile.username}`}>sign in</Link>. Hotname owners only respond to verified accounts.
          </div>
        ) : viewer.id === profile.id ? (
          <div className="auth-nudge">
            This is your own profile. <Link href="/channels">Edit your channels →</Link>
          </div>
        ) : requestableChannels.length === 0 ? null : (
          <RequestForm
            ownerUsername={profile.username}
            requestableChannels={requestableChannels.map((c) => c.type)}
          />
        )}
      </div>

      <div className="profile-footer">
        <Link href="/">Powered by hotname · Your Hotname is all they need.</Link>
      </div>
    </div>
  );
}
