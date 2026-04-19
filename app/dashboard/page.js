import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CHANNEL_META } from '@/lib/channelMeta';
import RequestCard from '../requests/RequestCard';

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

  const [channelsResult, requestsResult] = await Promise.all([
    supabase
      .from('channels')
      .select('type, access_mode')
      .eq('user_id', user.id),
    supabase
      .from('connection_requests')
      .select('id, requester_username, channel_type, reason, status, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const channels = channelsResult.data ?? [];
  const requests = requestsResult.data ?? [];
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
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
      <nav>
        <Link href="/dashboard"><span className="logo">hotname<span className="logo-dot" /></span></Link>
        <div className="nav-actions">
          <Link href="/channels"><button className="btn-ghost">Channels</button></Link>
          <Link href="/requests"><button className="btn-ghost">Requests{pendingCount ? ` · ${pendingCount}` : ''}</button></Link>
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
          <Link href="/requests" className="quick-card">
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

        {/* Recent requests */}
        <h2>Recent requests</h2>
        {requests.length === 0 ? (
          <p className="empty">No requests yet. Share your Hotname to start receiving them.</p>
        ) : (
          <div className="req-list">
            {requests.slice(0, 3).map((r) => <RequestCard key={r.id} request={r} />)}
            {requests.length > 3 && (
              <Link href="/requests" style={{ textAlign: 'center', padding: '8px', color: 'var(--accent-text)', fontSize: '13px' }}>
                See all requests →
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
