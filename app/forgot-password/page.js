'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/app/components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forgot-password', email }),
      });

      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        setError(json.error || 'Something went wrong. Please try again.');
      } else {
        setSent(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <nav>
        <Link href="/"><Logo /></Link>
      </nav>
      <div className="form-wrap">
        <div className="card">
          {sent ? (
            <>
              <h2>Check your email</h2>
              <p className="sub" style={{ marginBottom: 0 }}>
                We sent a password reset link to <strong>{email}</strong>.
                Check your spam folder if it doesn&apos;t arrive within a minute.
              </p>
              <p style={{ marginTop: '1.5rem', fontSize: '13px' }}>
                <Link href="/login" style={{ color: 'var(--accent-text)' }}>Back to sign in</Link>
              </p>
            </>
          ) : (
            <>
              <h2>Reset password</h2>
              <p className="sub">Enter your email and we&apos;ll send a reset link.</p>

              {error && <p className="error-msg">{error}</p>}

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="link-text">
                <Link href="/login">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
