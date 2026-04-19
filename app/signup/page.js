'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = new FormData(e.target);
    const email = data.get('email');
    const password = data.get('password');
    const username = data.get('username');
    const display_name = data.get('display_name');
    const phone_number = data.get('phone_number');
    const messaging_consent = data.get('messaging_consent') === 'on';

    if (!messaging_consent) {
      setError('Please agree to the Terms and messaging policy to continue.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', email, password, username, display_name, phone_number, messaging_consent }),
        signal: controller.signal,
      });

      let json = {};
      try { json = await res.json(); } catch { /* non-JSON */ }

      if (!res.ok) {
        setError(json.error || 'Unable to create account right now.');
        return;
      }
      router.push(next);
    } catch (err) {
      if (err?.name === 'AbortError') setError('Request timed out. Please try again.');
      else setError('Network error. Please check your connection and try again.');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Claim your Hotname</h2>
      <p className="sub">Your Hotname is all they need. Pick one.</p>

      {error && <p className="error-msg">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Your Hotname</label>
          <div className="prefix">
            <span className="at">@</span>
            <input
              name="username"
              type="text"
              placeholder="yourname"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_]+"
              title="Letters, numbers and underscores only"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '4px' }}>
            3–30 characters, letters/numbers/underscore. Permanent.
          </p>
        </div>

        <div className="field">
          <label>Display name</label>
          <input
            name="display_name"
            type="text"
            placeholder="Your name"
            maxLength={60}
            autoComplete="name"
          />
        </div>

        <div className="field">
          <label>Email</label>
          <input name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        </div>

        <div className="field">
          <label>Password</label>
          <input name="password" type="password" placeholder="Min 8 characters" required minLength={8} autoComplete="new-password" />
        </div>

        <div className="field">
          <label>Phone <span style={{ color: 'var(--text-soft)' }}>(optional)</span></label>
          <input
            name="phone_number"
            type="tel"
            placeholder="+447911123456"
            pattern="\+[0-9]{7,15}"
            title="E.164 format: start with + and country code"
            autoComplete="tel"
          />
          <p style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '4px' }}>
            Kept private. Only used to notify you when someone approves a WhatsApp or SMS request.
          </p>
        </div>

        <label className="consent">
          <input type="checkbox" name="messaging_consent" required />
          <span>
            I agree to the <Link href="/terms">Terms</Link> and consent to receive messages
            through Hotname on the channels I open — including{' '}
            <strong>WhatsApp</strong>, <strong>SMS</strong>, <strong>Email</strong> and{' '}
            <strong>Post</strong> — in line with the{' '}
            <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer">WhatsApp Business messaging policy</a>.
          </span>
        </label>

        <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="link-text">Already have an account? <Link href="/login">Sign in</Link></p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <>
      <nav>
        <Link href="/"><span className="logo">hotname<span className="logo-dot" /></span></Link>
        <div className="nav-actions">
          <Link href="/login"><button className="btn-ghost">Log in</button></Link>
        </div>
      </nav>
      <div className="form-wrap">
        <Suspense fallback={<div className="card"><p className="sub">Loading…</p></div>}>
          <SignupForm />
        </Suspense>
      </div>
    </>
  );
}
