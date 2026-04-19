'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RenameForm() {
  const router = useRouter();
  const [target, setTarget] = useState('');
  const [next, setNext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_username: target, new_username: next }),
      });
      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setError(json.error || 'Rename failed.');
      } else {
        setSuccess(`Renamed to @${json.username}`);
        setTarget(''); setNext('');
        router.refresh();
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 'none', marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Rename a Hotname</h3>
      <p className="sub" style={{ marginBottom: '1rem' }}>
        Use with care — links, profile URLs, and any shared references with the old handle will break.
      </p>
      {error && <p className="error-msg">{error}</p>}
      {success && <p style={{ color: 'var(--ok)', fontSize: '13px', marginBottom: '10px' }}>{success}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Current handle
          </label>
          <div className="prefix">
            <span className="at">@</span>
            <input
              className="ch-input"
              style={{ paddingLeft: '26px' }}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="null"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              required
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            New handle
          </label>
          <div className="prefix">
            <span className="at">@</span>
            <input
              className="ch-input"
              style={{ paddingLeft: '26px' }}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="oshi"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              required
            />
          </div>
        </div>
        <button className="btn-primary" type="submit" disabled={loading || !target || !next}>
          {loading ? '…' : 'Rename'}
        </button>
      </div>
    </form>
  );
}
