'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/app/components/Logo';

function LoginForm() {
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

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });

      let json = {};
      try { json = await res.json(); } catch { /* non-JSON */ }

      if (!res.ok) setError(json.error || 'Invalid email or password.');
      else router.push(next);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Welcome back</h2>
      <p className="sub">Sign in to your Hotname.</p>

      {error && <p className="error-msg">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        </div>

        <div className="field">
          <label>Password</label>
          <input name="password" type="password" placeholder="Your password" required autoComplete="current-password" />
        </div>

        <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="link-text"><Link href="/forgot-password">Forgot your password?</Link></p>
      <p className="link-text">No account? <Link href="/signup">Create one</Link></p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <nav>
        <Link href="/"><Logo /></Link>
        <div className="nav-actions">
          <Link href="/signup"><button className="btn-ghost">Claim yours</button></Link>
        </div>
      </nav>
      <div className="form-wrap">
        <Suspense fallback={<div className="card"><p className="sub">Loading…</p></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}
