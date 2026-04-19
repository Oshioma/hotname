'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function ConnectionCard({ connection }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const initials = connection.requester_username.slice(0, 2).toUpperCase();

  async function respond(action) {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/connections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: connection.id, action }),
      });
      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }
      if (!res.ok) { setError(json.error || 'Could not update.'); return; }
      router.refresh();
    } catch { setError('Network error.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="req-card">
      <div className="req-card-head">
        <div className="req-avatar">{initials}</div>
        <div className="req-who">
          <div className="name">@{connection.requester_username}</div>
          <div className="handle">wants to connect</div>
        </div>
        <span className="req-age">{formatAgo(connection.created_at)}</span>
      </div>

      {connection.message && <p className="req-reason">{connection.message}</p>}

      {error && <p className="error-msg">{error}</p>}

      <div className="req-actions">
        <button className="btn-primary" disabled={busy} onClick={() => respond('accept')}>Accept</button>
        <button className="btn-deny"    disabled={busy} onClick={() => respond('decline')}>Decline</button>
      </div>
    </div>
  );
}
