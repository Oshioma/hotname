'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ChannelCard from './ChannelCard';

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
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hot<span>name</span></span></Link>
        <Link href="/dashboard"><button className="btn-ghost">← Dashboard</button></Link>
      </nav>

      <div className="dash">
        <h2>Channels</h2>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '1.5rem', maxWidth: '520px' }}>
          Control how people can contact you. Set each channel to <strong>Everyone</strong> (visible on your public profile) or <strong>Selected people</strong> (only people you add can see it).
        </p>

        {error && <p className="error-msg">{error}</p>}

        {loading ? (
          <p className="empty">Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {channels.map((ch) => (
              <ChannelCard key={ch.type} channel={ch} onRefresh={fetchChannels} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
