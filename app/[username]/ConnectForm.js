'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX = 500;

/**
 * The gate. Visitors must request to connect with an intro message before
 * they can message the owner through any channel.
 *   status = null       → no connection, show intro form
 *   status = 'pending'  → waiting
 *   status = 'declined' → show a quieter form to try again
 */
export default function ConnectForm({ ownerUsername, ownerDisplayName, viewerLoggedIn, status }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!viewerLoggedIn) {
      const next = encodeURIComponent(`/${ownerUsername}`);
      router.push(`/login?next=${next}`);
      return;
    }
    if (!message.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_username: ownerUsername, message: message.trim() }),
      });
      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setError(json.error || 'Could not send request. Try again.');
        return;
      }
      setSent(true);
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent || status === 'pending') {
    return (
      <div className="sent-card">
        <div className="tick">•</div>
        <h3>Request pending</h3>
        <p>We&apos;ll let you know when @{ownerUsername} responds. You can message them once they accept.</p>
      </div>
    );
  }

  const isRetry = status === 'declined';

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <h3>Request to connect with @{ownerUsername}</h3>
      <p className="hint">
        Introduce yourself briefly. Once {ownerDisplayName.split(' ')[0] || '@' + ownerUsername} accepts, you can message them through the channels they&apos;ve opened.
        {isRetry && ' Your previous request was declined — a new message gives it another chance.'}
      </p>

      {error && <p className="error-msg">{error}</p>}

      <div className="ch-detail-label">Your intro</div>
      <textarea
        rows={4}
        placeholder="Hi, I'm …"
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
        required
        disabled={!viewerLoggedIn}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>
          {message.length} / {MAX}
          {!viewerLoggedIn && ' · sign in to send'}
        </span>
        <button className="btn-primary" type="submit" disabled={viewerLoggedIn && (loading || !message.trim())}>
          {!viewerLoggedIn ? 'Sign in to connect' : (loading ? 'Sending…' : 'Request to connect')}
        </button>
      </div>
    </form>
  );
}
