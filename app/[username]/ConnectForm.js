'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The gate. Visitors ask to connect before they can message the owner.
 *   status = null       → no connection, show request button
 *   status = 'pending'  → waiting
 *   status = 'declined' → show a quieter retry
 */
export default function ConnectForm({ ownerUsername, viewerLoggedIn, status }) {
  const router = useRouter();
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
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_username: ownerUsername }),
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

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <h3>Request to connect with @{ownerUsername}</h3>

      {error && <p className="error-msg">{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
        <button className="btn-primary" type="submit" disabled={viewerLoggedIn && loading}>
          {!viewerLoggedIn ? 'Sign in to connect' : (loading ? 'Sending…' : 'Request to connect')}
        </button>
      </div>
    </form>
  );
}
