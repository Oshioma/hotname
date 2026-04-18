'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', email, password, username }),
        signal: controller.signal,
      });

      let json = {};
      try {
        json = await res.json();
      } catch {
        // Ignore JSON parse errors and surface a generic error below.
      }

      if (!res.ok) {
        setError(json.error || 'Unable to create account right now.');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      if (err?.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <>
      <nav>
        <Link href="/"><span className="logo">hot<span>name</span></span></Link>
      </nav>
      <div className="form-wrap">
        <div className="card">
          <h2>Create account</h2>
          <p className="sub">Set up your Hotname in seconds.</p>

          {error && <p className="error-msg">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Username</label>
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
                />
              </div>
            </div>

            <div className="field">
              <label>Email</label>
              <input name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div className="field">
              <label>Password</label>
              <input name="password" type="password" placeholder="Min 8 characters" required minLength={8} autoComplete="new-password" />
            </div>

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="link-text">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
