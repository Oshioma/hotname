'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ChannelRow from './ChannelRow';

export default function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/channels');
      if (!res.ok) { setError('Failed to load channels.'); return; }
      const json = await res.json();
      setChannels(json.channels ?? []);
      setError('');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hotname<span className="logo-dot" /></span></Link>
        <div className="nav-actions">
          <Link href="/dashboard"><button className="btn-ghost">← Dashboard</button></Link>
        </div>
      </nav>

      <div className="page">
        <h2 style={{ marginTop: 0 }}>Channels</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '-0.4rem', marginBottom: '1.2rem', maxWidth: '560px' }}>
          Each channel has an access mode. <strong>Open</strong> shows the detail directly.
          <strong> Request access</strong> lists the channel but hides the detail until you approve.
          <strong> Invite only</strong> reveals it only to usernames you pick. <strong>Hidden</strong> removes it entirely.
        </p>

        {error && <p className="error-msg">{error}</p>}

        {loading ? (
          <p className="empty">Loading…</p>
        ) : (
          <div className="ch-list">
            {channels.map((ch) => (
              <ChannelRow key={ch.type} channel={ch} onRefresh={fetchChannels} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
