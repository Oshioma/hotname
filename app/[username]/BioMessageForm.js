'use client';

import { useState } from 'react';

const MAX = 500;

export default function BioMessageForm({ username }) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_username: username, body: body.trim(), platform: 'bio' }),
      });

      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        setError(json.error || 'Failed to send. Please try again.');
      } else {
        setSent(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="bio-sent">
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✓</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '6px' }}>Sent!</h3>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '1.5rem' }}>
          @{username} will see your anonymous message.
        </p>
        <button className="btn-outline" onClick={() => { setSent(false); setBody(''); }}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form className="bio-msg-form" onSubmit={handleSubmit}>
      <p className="bio-form-label">Send an anonymous message</p>
      {error && <p className="error-msg">{error}</p>}
      <textarea
        rows={4}
        placeholder={`Say something to @${username}…`}
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX))}
        required
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ fontSize: '11px', color: '#555' }}>{body.length} / {MAX}</span>
        <button
          className="btn-primary"
          type="submit"
          disabled={loading || !body.trim()}
        >
          {loading ? 'Sending…' : 'Send anonymously'}
        </button>
      </div>
    </form>
  );
}
