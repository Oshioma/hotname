import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CHANNEL_META } from '@/lib/channelMeta';
import RequestCard from '../requests/RequestCard';
import InlineSearch from './InlineSearch';
import ConnectionCard from './ConnectionCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio, location, verified')
    .eq('id', user.id)
    .single();

  const username = profile?.username ?? null;

  const [channelsResult, inboxResult, pendingResult, connectionsResult] = await Promise.all([
    supabase
      .from('channels')
      .select('type, access_mode')
      .eq('user_id', user.id),
    supabase
      .from('connection_requests')
      .select('id, requester_username, channel_type, reason, status, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('connection_requests')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'pending'),
    supabase
      .from('user_connections')
      .select('id, requester_username, message, created_at')
      .eq('owner_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const channels = channelsResult.data ?? [];
  const inbox = inboxResult.data ?? [];
  const pendingCount = pendingResult.count ?? 0;
  const pendingConnections = connectionsResult.data ?? [];
  const openCount = channels.filter((c) => c.access_mode !== 'hidden').length;

  const initials = (profile?.display_name || profile?.username || user.email)
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const siteHost = (process.env.NEXT_PUBLIC_SITE_URL ?? '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const shareDisplay = username
    ? (siteHost ? `${siteHost}/${username}` : `/${username}`)
    : null;

  return (
    <>
      <nav className="nav-with-search">
        <Link href="/dashboard"><span className="logo">hotname<span className="logo-dot" /></span></Link>
        <div className="nav-search">
          <InlineSearch placeholder="Find a Hotname — @handle or name" />
        </div>
        <div className="nav-actions">
          <Link href="/channels"><button className="btn-ghost">Channels</button></Link>
          <Link href="/settings"><button className="btn-ghost">Settings</button></Link>
          <form action="/api/auth" method="POST" style={{ display: 'inline' }}>
            <input type="hidden" name="action" value="signout" />
            <button className="btn-quiet" type="submit">Sign out</button>
          </form>
        </div>
      </nav>

      <div className="page">
        {/* Identity */}
        <div className="identity-card">
          <div className="identity-avatar">{initials}</div>
          <div className="identity-main">
            <div className="identity-name">{profile?.display_name || `@${username}`}</div>
            <div className="identity-handle">@{username}</div>
            {profile?.bio && <p className="identity-bio">{profile.bio}</p>}
            {shareDisplay && (
              <div className="identity-link">{shareDisplay}</div>
            )}
          </div>
          {username && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href={`/${username}`} target="_blank">
                <button className="btn-outline" style={{ fontSize: '13px', padding: '8px 16px' }}>View public profile</button>
              </Link>
              <Link href="/settings">
                <button className="btn-quiet" style={{ fontSize: '12px' }}>Edit profile</button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="quick-grid">
          <Link href="/requests?filter=pending" className="quick-card">
            <div className="label">Pending requests</div>
            <div className="val">{pendingCount}<small>waiting</small></div>
          </Link>
          <Link href="/channels" className="quick-card">
            <div className="label">Open channels</div>
            <div className="val">{openCount}<small>of {Object.keys(CHANNEL_META).length}</small></div>
          </Link>
          <Link href={username ? `/${username}` : '#'} className="quick-card">
            <div className="label">Your public profile</div>
            <div className="val" style={{ fontSize: '14px', fontFamily: 'ui-monospace, monospace' }}>@{username} →</div>
          </Link>
        </div>

        {/* Connection requests */}
        {pendingConnections.length > 0 && (
          <>
            <h2 style={{ marginTop: '1.8rem' }}>Connection requests</h2>
            <div className="req-list" style={{ marginBottom: '0.5rem' }}>
              {pendingConnections.map((c) => <ConnectionCard key={c.id} connection={c} />)}
            </div>
          </>
        )}

        {/* Inbox */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '1.8rem', marginBottom: '0.85rem' }}>
          <h2 style={{ margin: 0 }}>Inbox</h2>
          <Link href="/requests?filter=pending">
            <button className="btn-ghost" style={{ fontSize: '12px' }}>
              See requests{pendingCount ? ` · ${pendingCount}` : ''} →
            </button>
          </Link>
        </div>
        {inbox.length === 0 ? (
          <p className="empty">No messages yet. Share your Hotname to start receiving them.</p>
        ) : (
          <div className="req-list">
            {inbox.map((m) => <RequestCard key={m.id} request={m} />)}
          </div>
        )}
      </div>
    </>
  );
}
