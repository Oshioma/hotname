'use client';

import { useState } from 'react';
import Link from 'next/link';

const PLATFORMS = ['Twitter / X', 'Instagram', 'WhatsApp', 'Email', 'General'];

export default function UserSendPage({ params }) {
  const { username } = params;
  const [platform, setPlatform] = useState('General');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const MAX = 500;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_username: username, platform, body: body.trim() }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || 'Failed to send message.');
    } else {
      setSent(true);
    }
  }

  return (
    <>
      <nav>
        <Link href="/"><span className="logo">hot<span>name</span></span></Link>
      </nav>
      <div className="send-wrap">
        <div className="send-card">
          {sent ? (
            <div className="success-box">
              <div className="tick">✅</div>
              <h3>Message sent!</h3>
              <p>Your message was delivered to @{username}.</p>
              <button
                className="btn-primary"
                style={{ marginTop: '1.5rem' }}
                onClick={() => { setSent(false); setBody(''); }}
              >
                Send another
              </button>
            </div>
          ) : (
            <>
              <div className="to-user">
                <div className="avatar">{username[0].toUpperCase()}</div>
                <div>
                  <p style={{ fontWeight: 600 }}>@{username}</p>
                  <p style={{ fontSize: '12px', color: '#888' }}>Send an anonymous message</p>
                </div>
              </div>

              {error && <p className="error-msg">{error}</p>}

              <form onSubmit={handleSubmit}>
                <p style={{ fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform</p>
                <div className="plat-tabs" style={{ marginBottom: '1rem' }}>
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`plat-tab${platform === p ? ' active' : ''}`}
                      onClick={() => setPlatform(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="field">
                  <label>Message</label>
                  <textarea
                    rows={5}
                    placeholder="Write your message…"
                    value={body}
                    onChange={(e) => setBody(e.target.value.slice(0, MAX))}
                    required
                  />
                  <p className="char-count">{body.length}/{MAX}</p>
                </div>

                <button
                  className="btn-primary"
                  type="submit"
                  disabled={loading || !body.trim()}
                  style={{ width: '100%' }}
                >
                  {loading ? 'Sending…' : 'Send message'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
