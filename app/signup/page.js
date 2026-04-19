'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/app/components/Logo';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [availability, setAvailability] = useState({ state: 'idle' }); // idle | checking | available | taken | invalid
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Live availability check
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean) { setAvailability({ state: 'idle' }); return; }
    if (!USERNAME_RE.test(clean)) {
      setAvailability({ state: 'invalid' });
      return;
    }
    setAvailability({ state: 'checking' });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(clean)}`, { signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        const taken = (json.results ?? []).some((r) => r.username === clean);
        setAvailability({ state: taken ? 'taken' : 'available' });
      } catch { /* aborted */ }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [username]);

  function handleContinue(e) {
    e.preventDefault();
    if (availability.state !== 'available') return;
    setStep(2);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = new FormData(e.target);
    const email = data.get('email');
    const password = data.get('password');
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
        body: JSON.stringify({
          action: 'signup',
          email,
          password,
          username: username.trim().toLowerCase().replace(/^@/, ''),
          display_name,
          phone_number,
          messaging_consent,
        }),
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

  if (step === 1) {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    const canContinue = availability.state === 'available';
    return (
      <div className="card signup-pick">
        <h2>Pick your Hotname</h2>
        <p className="sub">
          This becomes your permanent handle — <strong>@{clean || 'yourname'}</strong>. You can&apos;t change it later, so choose one you&apos;ll want to keep.
        </p>

        <form onSubmit={handleContinue}>
          <div className="signup-pick-input">
            <span className="at">@</span>
            <input
              type="text"
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              maxLength={30}
            />
          </div>

          <div className={`signup-pick-status signup-pick-${availability.state}`}>
            {availability.state === 'idle'      && <span>3–30 characters. Letters, numbers and underscore.</span>}
            {availability.state === 'invalid'   && <span>Only letters, numbers and underscore. 3–30 characters.</span>}
            {availability.state === 'checking'  && <span>Checking…</span>}
            {availability.state === 'available' && <span>✓ @{clean} is yours to claim.</span>}
            {availability.state === 'taken'     && <span>@{clean} is already taken.</span>}
          </div>

          <button
            className="btn-primary"
            type="submit"
            disabled={!canContinue}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            Claim @{clean || 'yourname'} →
          </button>
        </form>

        <p className="link-text">Already have an account? <Link href="/login">Sign in</Link></p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Create your account</h2>
      <p className="sub">
        Claiming <strong>@{username.trim().toLowerCase().replace(/^@/, '')}</strong>.{' '}
        <button type="button" className="btn-quiet" onClick={() => setStep(1)} style={{ padding: 0, fontSize: 'inherit' }}>
          Change
        </button>
      </p>

      {error && <p className="error-msg">{error}</p>}

      <form onSubmit={handleSignup}>
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
          <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '4px' }}>
            Kept private. Only used to notify you when someone approves a WhatsApp or SMS request.
          </p>
        </div>

        <label className="consent">
          <input type="checkbox" name="messaging_consent" required />
          <span>
            I agree to the <Link href="/terms">Terms</Link> and consent to receive messages through Hotname on the channels I choose.
          </span>
        </label>

        <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <>
      <nav>
        <Link href="/"><Logo /></Link>
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
