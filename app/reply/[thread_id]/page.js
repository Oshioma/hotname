'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ReplyThreadPage() {
  const { thread_id } = useParams();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef(null);

  const fetchThread = useCallback(async () => {
    try {
      const res = await fetch(`/api/thread/${thread_id}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Thread not found.');
      } else {
        setThread(json);
      }
    } catch {
      setError('Failed to load thread.');
    } finally {
      setLoading(false);
    }
  }, [thread_id]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages]);

  async function handleReply(e) {
    e.preventDefault();
    if (!thread?.can_reply || !body.trim()) return;
    setSendError('');
    setSending(true);

    try {
      const lastMsg = thread.messages[thread.messages.length - 1];
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_username: thread.reply_to_username,
          body: body.trim(),
          channel: 'app',
          thread_id: thread.thread_id,
          parent_id: lastMsg?.id,
        }),
      });

      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        setSendError(json.error || 'Failed to send reply.');
      } else {
        setBody('');
        fetchThread();
      }
    } catch {
      setSendError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <>
        <nav>
          <Link href="/dashboard"><span className="logo">hot<span>name</span></span></Link>
        </nav>
        <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>Loading thread…</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <nav>
          <Link href="/dashboard"><span className="logo">hot<span>name</span></span></Link>
        </nav>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#ff5c3a', marginBottom: '1rem' }}>{error}</p>
          <Link href="/dashboard"><button className="btn-ghost">Back to dashboard</button></Link>
        </div>
      </>
    );
  }

  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hot<span>name</span></span></Link>
        <Link href="/dashboard"><button className="btn-ghost">← Dashboard</button></Link>
      </nav>

      <div className="thread-wrap">
        <div className="thread-header">
          <div className="thread-anon-badge">Anonymous conversation</div>
          <p className="thread-hint">
            {thread.can_reply
              ? 'Replies are routed anonymously — neither side can see the other\'s identity.'
              : 'This message was sent anonymously and cannot be replied to.'}
          </p>
        </div>

        <div className="thread-messages">
          {thread.messages.map((msg) => (
            <div key={msg.id} className={`thread-bubble ${msg.direction}`}>
              <p className="bubble-body">{msg.body}</p>
              <p className="bubble-meta">
                {new Date(msg.created_at).toLocaleString()}
                <span className={`badge badge-${msg.channel}`} style={{ marginLeft: '6px' }}>
                  {msg.channel === 'sms' ? 'SMS' : msg.channel === 'whatsapp' ? 'WhatsApp' : 'App'}
                </span>
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {thread.can_reply ? (
          <form className="thread-reply-form" onSubmit={handleReply}>
            {sendError && <p className="error-msg" style={{ marginBottom: '8px' }}>{sendError}</p>}
            <textarea
              rows={3}
              placeholder="Write your reply…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={500}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: '#555' }}>{body.length} / 500</span>
              <button
                className="btn-primary"
                type="submit"
                disabled={sending || !body.trim()}
              >
                {sending ? 'Sending…' : 'Reply anonymously'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center', borderTop: '0.5px solid #2a2a2a' }}>
            <p style={{ fontSize: '13px', color: '#555' }}>This thread cannot be replied to.</p>
          </div>
        )}
      </div>
    </>
  );
}
