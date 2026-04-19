'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FindPage() {
  const router = useRouter();
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const clean = value.trim().replace(/^@/, '').toLowerCase();
    if (clean) router.push(`/${clean}`);
  }

  return (
    <>
      <nav>
        <Link href="/"><span className="logo">hotname<span className="logo-dot" /></span></Link>
        <div className="nav-actions">
          <Link href="/login"><button className="btn-ghost">Log in</button></Link>
          <Link href="/signup"><button className="btn-primary">Claim yours</button></Link>
        </div>
      </nav>

      <div className="search-wrap">
        <div className="search-card">
          <h1>Find a Hotname</h1>
          <p className="sub">Enter someone&apos;s Hotname to see how they accept contact.</p>

          <form onSubmit={handleSubmit}>
            <div className="search-input">
              <span className="at">@</span>
              <input
                type="text"
                placeholder="username"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                required
              />
              <button type="submit">Go</button>
            </div>
          </form>

          <p className="link-text" style={{ marginTop: '1.2rem' }}>
            Don&apos;t have a Hotname yet? <Link href="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </>
  );
}
