'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHANNEL_META, CHANNEL_ORDER } from '@/lib/channelMeta';

function formatAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function RequestCard({ request }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showRedirect, setShowRedirect] = useState(false);
  const [error, setError] = useState('');

  const meta = CHANNEL_META[request.channel_type];
  const initials = request.requester_username.slice(0, 2).toUpperCase();
  const channelLabel = meta?.label ?? request.channel_type;
  const subtitle =
    request.status === 'pending' ? `wants to reach you on ${channelLabel}`
    : request.status === 'approved' ? `messaged you via ${channelLabel}`
    : request.status === 'denied' ? `was declined (${channelLabel})`
    : request.status === 'redirected' ? `redirected (${channelLabel})`
    : channelLabel;

  async function respond(action, redirect_to) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, action, redirect_to }),
      });
      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setError(json.error || 'Could not update request.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    request.status === 'pending'    ? 'Pending' :
    request.status === 'approved'   ? 'Approved' :
    request.status === 'denied'     ? 'Declined' :
    request.status === 'redirected' ? 'Redirected' : request.status;

  return (
    <div className="req-card">
      <div className="req-card-head">
        <div className="req-avatar">{initials}</div>
        <div className="req-who">
          <div className="name">@{request.requester_username}</div>
          <div className="handle">{subtitle}</div>
        </div>
        <span className="req-age">{formatAgo(request.created_at)}</span>
      </div>

      {request.reason && <p className="req-reason">{request.reason}</p>}

      <div className="req-meta">
        <span>Channel: <strong>{meta?.label ?? request.channel_type}</strong></span>
        <span className={`access-badge ${request.status}`}>{statusLabel}</span>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {request.status === 'pending' && (
        <>
          <div className="req-actions">
            <button className="btn-primary" disabled={busy} onClick={() => respond('approve')}>
              Approve
            </button>
            <button className="btn-deny" disabled={busy} onClick={() => respond('deny')}>
              Decline
            </button>
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={() => setShowRedirect((v) => !v)}
            >
              Redirect…
            </button>
          </div>

          {showRedirect && (
            <div className="redirect-panel">
              <p>Send them to a different channel instead:</p>
              <div className="redirect-options">
                {CHANNEL_ORDER
                  .filter((t) => t !== request.channel_type)
                  .map((t) => (
                    <button
                      key={t}
                      className="btn-ghost"
                      disabled={busy}
                      onClick={() => respond('redirect', t)}
                    >
                      {CHANNEL_META[t].label}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
