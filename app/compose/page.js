'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const CHANNELS = [
  { id: 'app', label: 'In-App', desc: 'Stored in Hotname' },
  { id: 'sms', label: 'SMS', desc: 'Sent to their phone' },
  { id: 'whatsapp', label: 'WhatsApp', desc: 'Via WhatsApp' },
];

function ComposeForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [toUsername, setToUsername] = useState(params.get('to') ?? '');
  const [channel, setChannel] = useState('app');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [lookupError, setLookupError] = useState('');

  // Look up recipient when username changes
  useEffect(() => {
    const username = toUsername.trim().replace(/^@/, '').toLowerCase();
    if (!username || username.length < 3) {
      setRecipientInfo(null);
      setLookupError('');
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user-lookup?username=${encodeURIComponent(username)}`);
        if (res.ok) {
          const json = await res.json();
          setRecipientInfo(json.profile);
          setLookupError('');
        } else {
          setRecipientInfo(null);
          setLookupError('User not found.');
        }
      } catch {
        setRecipientInfo(null);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [toUsername]);

  async function handleSend(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_username: toUsername.trim().replace(/^@/, '').toLowerCase(),
          body: body.trim(),
          channel,
        }),
      });

      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        setError(json.error || 'Failed to send message.');
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
      <div className="success-box">
        <div className="tick">✓</div>
        <h3>Message sent!</h3>
        <p>Your message was delivered via {CHANNELS.find((c) => c.id === channel)?.label}.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button className="btn-outline" onClick={() => { setSent(false); setBody(''); }}>
            Send another
          </button>
          <Link href="/dashboard"><button className="btn-ghost">Dashboard</button></Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSend}>
      {error && <p className="error-msg">{error}</p>}

      {/* Recipient */}
      <div className="field">
        <label>To (hotname)</label>
        <div className="prefix">
          <span className="at">@</span>
          <input
            type="text"
            placeholder="username"
            value={toUsername}
            onChange={(e) => setToUsername(e.target.value)}
            required
            autoFocus={!toUsername}
          />
        </div>
        {recipientInfo && (
          <p style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>
            ✓ {recipientInfo.display_name || `@${recipientInfo.username}`}
            {recipientInfo.phone_number ? ' · SMS/WhatsApp available' : ' · No phone number (app only)'}
          </p>
        )}
        {lookupError && <p style={{ fontSize: '12px', color: '#ff5c3a', marginTop: '4px' }}>{lookupError}</p>}
      </div>

      {/* Channel */}
      <div className="field">
        <label>Send via</label>
        <div className="plat-tabs">
          {CHANNELS.map((ch) => {
            const disabled = (ch.id === 'sms' || ch.id === 'whatsapp') && recipientInfo && !recipientInfo.phone_number;
            return (
              <button
                key={ch.id}
                type="button"
                className={`plat-tab${channel === ch.id ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                onClick={() => !disabled && setChannel(ch.id)}
                title={disabled ? 'This user has no phone number' : ch.desc}
              >
                {ch.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Message body */}
      <div className="field">
        <label>Message</label>
        <textarea
          rows={5}
          placeholder="Write your message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={500}
          style={{ resize: 'vertical' }}
        />
        <p className="char-count">{body.length} / 500</p>
      </div>

      <button
        className="btn-primary"
        type="submit"
        disabled={loading || !toUsername.trim() || !body.trim()}
        style={{ width: '100%' }}
      >
        {loading ? 'Sending…' : `Send via ${CHANNELS.find((c) => c.id === channel)?.label}`}
      </button>
    </form>
  );
}

export default function ComposePage() {
  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hot<span>name</span></span></Link>
        <Link href="/dashboard"><button className="btn-ghost">← Back</button></Link>
      </nav>
      <div className="send-wrap">
        <div className="send-card">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.3rem' }}>Compose message</h2>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '1.5rem' }}>
            Send a message via SMS, WhatsApp, or in-app.
          </p>
          <Suspense fallback={<p style={{ color: '#888', fontSize: '13px' }}>Loading…</p>}>
            <ComposeForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}
