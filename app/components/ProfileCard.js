'use client';

import Link from 'next/link';
import { CHANNEL_META } from '@/lib/channelMeta';
import MessageComposer from '@/app/[username]/MessageComposer';
import ConnectForm from '@/app/[username]/ConnectForm';

/** How a contact detail reads on a chip: "+447951…", "name@x.com", "@handle", "site.com". */
function displayValue(type, value) {
  const kind = CHANNEL_META[type]?.kind;
  if (!value) return '';
  if (kind === 'handle') return `@${String(value).replace(/^@/, '')}`;
  if (kind === 'url') return String(value).replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return String(value);
}

function ChannelChip({ ch }) {
  const meta = CHANNEL_META[ch.type];
  const visible = (ch.mode === 'direct' || ch.mode === 'allowed') && ch.value;
  const href = visible && typeof meta.valueToLink === 'function' ? meta.valueToLink(ch.value) : null;

  const inner = (
    <>
      {meta.label}
      {visible && <span className="avail-chip-value">{displayValue(ch.type, ch.value)}</span>}
    </>
  );

  if (href) {
    const external = /^https?:/i.test(href);
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={`avail-chip avail-${ch.mode} avail-clickable`}
      >
        {inner}
      </a>
    );
  }
  return <span className={`avail-chip avail-${ch.mode}`}>{inner}</span>;
}

/**
 * The body of a Hotname profile — hero, contact details, connect / message.
 * `view` is the object returned by loadProfileView (lib/profileView.js).
 * Used full-size on /[username] and compact inside the home-page search.
 */
export default function ProfileCard({ view, compact = false }) {
  const {
    profile, channels, composerChannels, requestsByType,
    connectionStatus, canMessage, isSelf, viewerLoggedIn,
  } = view;

  // One <h1> per page: inside the home-page search the name is an <h2>.
  const Heading = compact ? 'h2' : 'h1';

  const initials = (profile.display_name || profile.username)
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  // Split by intent:
  //   Message → channels Hotname can route a message to (WhatsApp, SMS, Email, Post)
  //   Links   → places you go yourself (Instagram, Website, Telegram, Signal, call, booking)
  const linkChannels = [];
  const messageChannels = [];
  for (const ch of channels) {
    const meta = CHANNEL_META[ch.type];
    if (!meta) continue;
    if (meta.deliverable) messageChannels.push(ch);
    else linkChannels.push(ch);
  }

  return (
    <div className={compact ? 'profile-card profile-card-compact' : 'profile-card'}>
      <section className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <Heading className="profile-name">{profile.display_name || profile.username}</Heading>
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
        <div className="available-sections">
          {linkChannels.length > 0 && (
            <div className="available-on">
              <span className="available-on-label">Links</span>
              <div className="available-on-chips">
                {linkChannels.map((ch) => <ChannelChip key={ch.type} ch={ch} />)}
              </div>
            </div>
          )}
          {messageChannels.length > 0 && (
            <div className="available-on">
              <span className="available-on-label">Message</span>
              <div className="available-on-chips">
                {messageChannels.map((ch) => <ChannelChip key={ch.type} ch={ch} />)}
              </div>
            </div>
          )}
        </div>
      )}

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
              viewerLoggedIn={viewerLoggedIn}
              isSelf={isSelf}
            />
          )
        ) : (
          <ConnectForm
            ownerUsername={profile.username}
            viewerLoggedIn={viewerLoggedIn}
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
    </div>
  );
}
