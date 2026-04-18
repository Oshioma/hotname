import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import BioMessageForm from './BioMessageForm';

export async function generateMetadata({ params }) {
  const { username } = await params;
  return {
    title: `@${username} — Hotname`,
    description: `Contact ${username} via Hotname.`,
  };
}

const CH_META = {
  whatsapp: { label: 'WhatsApp', icon: '💬', color: '#25d366' },
  sms:      { label: 'SMS',      icon: '📱', color: '#007aff' },
  email:    { label: 'Email',    icon: '✉️',  color: '#ff5c3a' },
  post:     { label: 'Post',     icon: '📮', color: '#f59e0b' },
};

export default async function BioPage({ params }) {
  const { username } = await params;
  const supabase = await createClient();
  const service  = createServiceClient();

  // Owner profile
  const { data: profile } = await service
    .from('profiles')
    .select('id, username, display_name, bio')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  if (!profile) notFound();

  // Current viewer (may be null if unauthenticated)
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

  // Fetch enabled channels for the profile owner
  const { data: channelRows } = await service
    .from('channels')
    .select('id, type, enabled, default_access, value')
    .eq('user_id', profile.id)
    .eq('enabled', true);

  // Determine which channels the viewer can see
  const visibleChannels = [];
  for (const ch of channelRows ?? []) {
    if (ch.default_access === 'everyone') {
      visibleChannels.push({ type: ch.type, postalAddress: ch.type === 'post' ? null : undefined });
    } else if (viewerUsername) {
      // Check channel_access
      const { data: access } = await service
        .from('channel_access')
        .select('allowed_username')
        .eq('channel_id', ch.id)
        .eq('allowed_username', viewerUsername)
        .maybeSingle();
      if (access) {
        visibleChannels.push({
          type: ch.type,
          // Only expose postal address server-side to authorised viewers
          postalAddress: ch.type === 'post' ? ch.value : undefined,
        });
      }
    }
  }

  const initials = (profile.display_name || profile.username)
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bio-page">
      <nav className="bio-nav">
        <Link href="/"><span className="logo">hot<span>name</span></span></Link>
        <Link href="/signup"><button className="btn-ghost" style={{ fontSize: '12px' }}>Get your Hotname →</button></Link>
      </nav>

      <div className="bio-hero">
        <div className="bio-avatar">{initials}</div>
        <h1 className="bio-name">{profile.display_name || `@${profile.username}`}</h1>
        <p className="bio-handle">@{profile.username}</p>
        {profile.bio && <p className="bio-text">{profile.bio}</p>}
      </div>

      {/* Channel buttons */}
      {visibleChannels.length > 0 && (
        <div className="bio-channels">
          {visibleChannels.map((ch) => {
            const meta = CH_META[ch.type];
            if (ch.type === 'post' && ch.postalAddress) {
              return (
                <div key={ch.type} className="bio-postal-card">
                  <span style={{ fontSize: '20px' }}>{meta.icon}</span>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '13px', marginBottom: '4px' }}>Send a letter</p>
                    <p style={{ fontSize: '13px', color: '#ccc', whiteSpace: 'pre-line' }}>{ch.postalAddress}</p>
                  </div>
                </div>
              );
            }
            if (ch.type === 'post') return null; // authorized but no address (shouldn't happen)
            return (
              <Link
                key={ch.type}
                href={`/compose?to=${profile.username}&channel=${ch.type}`}
                className="bio-ch-btn"
                style={{ '--ch-color': meta.color }}
              >
                <span>{meta.icon}</span> {meta.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Anonymous message form */}
      <div className="bio-form-wrap">
        <BioMessageForm username={profile.username} />
      </div>

      <div className="bio-footer">
        <Link href="/">Powered by <strong>hotname</strong></Link>
      </div>
    </div>
  );
}
