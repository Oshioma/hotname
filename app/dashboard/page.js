import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile for username
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const username = profile?.username ?? null;

  // Fetch recent messages if the user has a username
  let messages = [];
  if (username) {
    const { data } = await supabase
      .from('messages')
      .select('id, body, platform, created_at')
      .eq('recipient_username', username)
      .order('created_at', { ascending: false })
      .limit(20);
    messages = data ?? [];
  }

  const shareUrl = username
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/${username}`
    : null;

  return (
    <>
      <nav>
        <span className="logo">hot<span>name</span></span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {username && (
            <Link href="/send"><button className="btn-ghost">Find someone</button></Link>
          )}
          <form action="/api/auth" method="POST" style={{ display: 'inline' }}>
            <input type="hidden" name="action" value="signout" />
            <button className="btn-ghost" type="submit">Sign out</button>
          </form>
        </div>
      </nav>

      <div className="dash">
        <h2>Dashboard</h2>

        <div className="profile-banner">
          <div>
            <h3>{username ? `@${username}` : user.email}</h3>
            <p>{user.email}</p>
            {shareUrl && (
              <div className="link-box">
                <span>{shareUrl}</span>
              </div>
            )}
          </div>
          {!username && (
            <p style={{ fontSize: '13px', color: '#ff5c3a' }}>
              No username set — check your profile setup.
            </p>
          )}
        </div>

        <h2>Messages</h2>
        {messages.length === 0 ? (
          <p className="empty">No messages yet. Share your link to start receiving messages.</p>
        ) : (
          <div className="msg-list">
            {messages.map((msg) => (
              <div key={msg.id} className="msg-item">
                <p className="msg-meta">
                  {new Date(msg.created_at).toLocaleString()}
                  {msg.platform && <span className="badge">{msg.platform}</span>}
                </p>
                <p className="msg-body">{msg.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
