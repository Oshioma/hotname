'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHANNEL_META } from '@/lib/channelMeta';

const MAX = 500;

/**
 * Unified composer. The viewer writes one message, picks one of the channels
 * the owner has opened, and Hotname routes it:
 *   - 'direct'   (Public)  → delivered straight away
 *   - 'allowed'  (Invite)  → delivered straight away
 */
export default function MessageComposer({ ownerUsername, channels, recentStatuses = {}, viewerLoggedIn = true }) {
  const router = useRouter();
  const [channel, setChannel] = useState(channels[0]?.type ?? '');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { delivered: bool, status: string }

  const activeChannel = channels.find((c) => c.type === channel);
  const mode = activeChannel?.mode;

  async function handleSubmit(e) {
    e.preventDefault();

    // Not signed in → bounce to login, preserving where they came from.
    if (!viewerLoggedIn) {
      const next = encodeURIComponent(`/${ownerUsername}`);
      router.push(`/login?next=${next}`);
      return;
    }

    if (!channel || !body.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_username: ownerUsername,
          channel_type: channel,
          reason: body.trim(),
        }),
      });
      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setError(json.error || 'Could not send. Please try again.');
        return;
      }
      setResult({ delivered: !!json.delivered, status: json.status ?? 'pending' });
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="sent-card">
        <div className="tick">✓</div>
        <h3>
          {result.delivered ? 'Message delivered' : 'Request sent'}
        </h3>
        <p>
          {result.delivered
            ? `@${ownerUsername} will receive your message via ${CHANNEL_META[channel]?.label}.`
            : `@${ownerUsername} will see it in their Hotname inbox and decide whether to reply on ${CHANNEL_META[channel]?.label}.`}
        </p>
      </div>
    );
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <h3>Send @{ownerUsername} a message</h3>
      <p className="hint">
        You never see their contact details — Hotname routes the message to the channel they&apos;ve opened.
      </p>

      {error && <p className="error-msg">{error}</p>}

      <div className="ch-detail-label">Deliver via</div>
      <div className="channel-pick">
        {channels.map((c) => {
          const meta = CHANNEL_META[c.type];
          const status = recentStatuses[c.type]?.status;
          const pending = status === 'pending';
          return (
            <button
              key={c.type}
              type="button"
              className={`channel-pick-btn${channel === c.type ? ' on' : ''}`}
              onClick={() => setChannel(c.type)}
              disabled={pending}
              title={pending ? 'Previous request is still pending' : ''}
            >
              {meta?.label ?? c.type}
              {pending && <span style={{ fontSize: '10px', marginLeft: '6px', opacity: 0.7 }}>· pending</span>}
            </button>
          );
        })}
      </div>

      <div className="ch-detail-label" style={{ marginTop: '12px' }}>Message</div>
      <textarea
        rows={3}
        placeholder={`Hi @${ownerUsername}…`}
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX))}
        required
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
          {body.length} / {MAX}
          {viewerLoggedIn && (mode === 'direct' || mode === 'allowed') && ' · delivered right away'}
          {!viewerLoggedIn && ' · sign in to send'}
        </span>
        <button
          className="btn-primary"
          type="submit"
          disabled={viewerLoggedIn && (loading || !body.trim() || !channel)}
        >
          {!viewerLoggedIn ? 'Sign in to send' : (loading ? 'Sending…' : 'Send')}
        </button>
      </div>
    </form>
  );
}
