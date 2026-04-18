'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SendPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const clean = username.trim().replace(/^@/, '');
    if (clean) {
      router.push(`/${clean}`);
    }
  }

  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hot<span>name</span></span></Link>
      </nav>
      <div className="send-wrap">
        <div className="send-card">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.3rem' }}>Find someone</h2>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '1.5rem' }}>
            Enter a Hotname username to send them a message.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Username</label>
              <div className="prefix">
                <span className="at">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <button className="btn-primary" type="submit" style={{ width: '100%' }}>
              Go to their page →
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
