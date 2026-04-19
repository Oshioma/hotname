'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHANNEL_META } from '@/lib/channelMeta';

const MAX_REASON = 300;

export default function RequestForm({ ownerUsername, requestableChannels }) {
  const router = useRouter();
  const [channel, setChannel] = useState(requestableChannels[0] ?? '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!channel || !reason.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_username: ownerUsername,
          channel_type: channel,
          reason: reason.trim(),
        }),
      });
      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setError(json.error || 'Could not send request. Please try again.');
        return;
      }
      setSent(true);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="sent-card">
        <div className="tick">✓</div>
        <h3>Request sent</h3>
        <p>@{ownerUsername} will review it and decide whether to approve, decline, or redirect you.</p>
      </div>
    );
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <h3>Request a connection</h3>
      <p className="hint">
        @{ownerUsername} decides whether to share the details for this channel.
      </p>

      {error && <p className="error-msg">{error}</p>}

      {requestableChannels.length > 1 && (
        <>
          <div className="ch-detail-label">Channel</div>
          <div className="channel-pick">
            {requestableChannels.map((c) => (
              <button
                key={c}
                type="button"
                className={`channel-pick-btn${channel === c ? ' on' : ''}`}
                onClick={() => setChannel(c)}
              >
                {CHANNEL_META[c]?.label ?? c}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="ch-detail-label">Why do you want to connect?</div>
      <textarea
        rows={4}
        placeholder={`One or two sentences helps @${ownerUsername} decide.`}
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
        required
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>{reason.length} / {MAX_REASON}</span>
        <button className="btn-primary" type="submit" disabled={loading || !reason.trim() || !channel}>
          {loading ? 'Sending…' : 'Request access'}
        </button>
      </div>
    </form>
  );
}
