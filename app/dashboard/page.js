import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PhoneBanner from './PhoneBanner';

const CH = { sms: 'SMS', whatsapp: 'WhatsApp', app: 'App' };

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

  const [inboxResult, sentResult, contactsResult] = await Promise.all([
    username
      ? supabase
          .from('messages')
          .select('id, thread_id, parent_id, body, channel, created_at, sender_id')
          .eq('recipient_username', username)
          .order('created_at', { ascending: false })
          .limit(30)
      : { data: [] },
    supabase
      .from('messages')
      .select('id, thread_id, recipient_username, body, channel, created_at')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('contacts')
      .select('id, contact_username, is_favorite, profiles!contacts_contact_username_fkey(display_name)')
      .eq('user_id', user.id)
      .order('is_favorite', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const inbox = inboxResult.data ?? [];
  const sent = sentResult.data ?? [];
  const contacts = contactsResult.data ?? [];
  const favorites = contacts.filter((c) => c.is_favorite);

  // Deduplicate sent into unique threads for the conversations strip
  const seenThreads = new Set();
  const conversations = sent.filter((m) => {
    if (seenThreads.has(m.thread_id)) return false;
    seenThreads.add(m.thread_id);
    return true;
  });

  const shareUrl = username
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/${username}`
    : null;

  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hot<span>name</span></span></Link>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/contacts"><button className="btn-ghost">Contacts</button></Link>
          <Link href="/channels"><button className="btn-ghost">Channels</button></Link>
          <Link href="/settings"><button className="btn-ghost">Settings</button></Link>
          <form action="/api/auth" method="POST" style={{ display: 'inline' }}>
            <input type="hidden" name="action" value="signout" />
            <button className="btn-ghost" type="submit">Sign out</button>
          </form>
        </div>
      </nav>

      <div className="dash">
        {/* Phone number nudge — shown at top when missing */}
        {!profile?.phone_number && <PhoneBanner />}

        {/* Profile banner */}
        <div className="profile-banner">
          <div>
            <h3>{profile?.display_name || (username ? `@${username}` : user.email)}</h3>
            {username && <p style={{ color: '#ff5c3a', fontFamily: 'monospace', fontSize: '13px' }}>@{username}</p>}
            <p>{user.email}</p>
            {profile?.phone_number && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{profile.phone_number} · SMS &amp; WhatsApp enabled</p>
            )}
            {shareUrl && (
              <>
                <div className="link-box" style={{ marginTop: '10px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareUrl}</span>
                </div>
                <Link href={`/${username}`} target="_blank">
                  <button className="btn-ghost" style={{ marginTop: '8px', fontSize: '12px' }}>View my profile →</button>
                </Link>
              </>
            )}
          </div>
          <Link href="/compose"><button className="btn-primary">Send a message</button></Link>
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

        {/* Conversations (sent threads) */}
        {conversations.length > 0 && (
          <>
            <h2>Conversations</h2>
            <div className="conv-list" style={{ marginBottom: '1.5rem' }}>
              {conversations.map((msg) => (
                <Link key={msg.thread_id} href={`/reply/${msg.thread_id}`} className="conv-row">
                  <div className="conv-avatar">{msg.recipient_username[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: '14px' }}>@{msg.recipient_username}</p>
                    <p className="conv-preview">{msg.body}</p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span className={`badge badge-${msg.channel}`}>{CH[msg.channel] ?? 'App'}</span>
                    <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                      {new Date(msg.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Inbox */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Inbox</h2>
          <Link href="/compose"><button className="btn-ghost" style={{ fontSize: '12px' }}>+ New message</button></Link>
        </div>

        {inbox.length === 0 ? (
          <p className="empty">No messages yet. Share your link to start receiving messages.</p>
        ) : (
          <div className="msg-list">
            {inbox.map((msg) => (
              <div key={msg.id} className="msg-item">
                <p className="msg-meta">
                  {new Date(msg.created_at).toLocaleString()}
                  <span className={`badge badge-${msg.channel ?? 'app'}`}>
                    {CH[msg.channel] ?? 'App'}
                  </span>
                </p>
                <p className="msg-body">{msg.body}</p>
                {msg.sender_id && (
                  <div style={{ marginTop: '8px' }}>
                    <Link href={`/reply/${msg.thread_id}`}>
                      <button className="btn-reply">Reply anonymously →</button>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
