import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const CHANNEL_LABEL = { sms: 'SMS', whatsapp: 'WhatsApp', app: 'App' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, phone_number')
    .eq('id', user.id)
    .single();

  const username = profile?.username ?? null;

  const [messagesResult, contactsResult] = await Promise.all([
    username
      ? supabase
          .from('messages')
          .select('id, body, channel, platform, created_at, sender_id')
          .eq('recipient_username', username)
          .order('created_at', { ascending: false })
          .limit(30)
      : { data: [] },
    supabase
      .from('contacts')
      .select('id, contact_username, is_favorite, profiles!contacts_contact_username_fkey(display_name)')
      .eq('user_id', user.id)
      .order('is_favorite', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const messages = messagesResult.data ?? [];
  const contacts = contactsResult.data ?? [];
  const favorites = contacts.filter((c) => c.is_favorite);

  const shareUrl = username
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/${username}`
    : null;

  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hot<span>name</span></span></Link>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/contacts"><button className="btn-ghost">Contacts</button></Link>
          <Link href="/settings"><button className="btn-ghost">Settings</button></Link>
          <form action="/api/auth" method="POST" style={{ display: 'inline' }}>
            <input type="hidden" name="action" value="signout" />
            <button className="btn-ghost" type="submit">Sign out</button>
          </form>
        </div>
      </nav>

      <div className="dash">
        {/* Profile banner */}
        <div className="profile-banner">
          <div>
            <h3>{profile?.display_name || (username ? `@${username}` : user.email)}</h3>
            {username && <p style={{ color: '#ff5c3a', fontFamily: 'monospace', fontSize: '13px' }}>@{username}</p>}
            <p>{user.email}</p>
            {profile?.phone_number
              ? <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{profile.phone_number} · SMS &amp; WhatsApp enabled</p>
              : <p style={{ fontSize: '12px', color: '#ff5c3a', marginTop: '4px' }}>No phone number — <Link href="/settings" style={{ color: '#ff5c3a', textDecoration: 'underline' }}>add one</Link> to receive SMS/WhatsApp</p>
            }
            {shareUrl && (
              <div className="link-box" style={{ marginTop: '10px' }}>
                <span>{shareUrl}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <Link href="/compose"><button className="btn-primary">Send a message</button></Link>
          </div>
        </div>

        {/* Favorites */}
        {favorites.length > 0 && (
          <>
            <h2>Favorites</h2>
            <div className="contacts-grid" style={{ marginBottom: '1.5rem' }}>
              {favorites.map((c) => (
                <Link key={c.id} href={`/compose?to=${c.contact_username}`} className="contact-chip favorite">
                  <span className="star">★</span>
                  <div>
                    <div className="chip-name">{c.profiles?.display_name || `@${c.contact_username}`}</div>
                    <div className="chip-user">@{c.contact_username}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Message history */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Messages received</h2>
          <Link href="/compose"><button className="btn-ghost" style={{ fontSize: '12px' }}>+ New message</button></Link>
        </div>

        {messages.length === 0 ? (
          <p className="empty">No messages yet. Share your link to start receiving messages.</p>
        ) : (
          <div className="msg-list">
            {messages.map((msg) => (
              <div key={msg.id} className="msg-item">
                <p className="msg-meta">
                  {new Date(msg.created_at).toLocaleString()}
                  <span className={`badge badge-${msg.channel ?? 'app'}`}>
                    {CHANNEL_LABEL[msg.channel] ?? msg.platform ?? 'App'}
                  </span>
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
