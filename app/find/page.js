'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FindPage() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const abortRef = useRef(null);

  // Debounced live search
  useEffect(() => {
    const q = value.trim().replace(/^@/, '');
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: abortRef.current.signal,
        });
        if (!res.ok) { setResults([]); return; }
        const json = await res.json();
        setResults(json.results ?? []);
        setHighlight(0);
      } catch {
        // aborted or network — ignore
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [value]);

  function goToUsername(username) {
    router.push(`/${username}`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (results[highlight]) {
      goToUsername(results[highlight].username);
      return;
    }
    const clean = value.trim().replace(/^@/, '').toLowerCase();
    if (clean) goToUsername(clean);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    }
  }

  const queryLength = value.trim().replace(/^@/, '').length;

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
          <p className="sub">Search by @handle or name.</p>

          <form onSubmit={handleSubmit}>
            <div className="search-input">
              <span className="at">@</span>
              <input
                type="text"
                placeholder="oshi"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <button type="submit">Go</button>
            </div>
          </form>

          {queryLength >= 2 && (
            <div className="search-results">
              {loading && results.length === 0 && (
                <div className="search-empty">Searching…</div>
              )}
              {!loading && results.length === 0 && (
                <div className="search-empty">No Hotnames match that.</div>
              )}
              {results.map((r, i) => {
                const initials = (r.display_name || r.username)
                  .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <button
                    key={r.username}
                    type="button"
                    className={`search-result${i === highlight ? ' on' : ''}`}
                    onClick={() => goToUsername(r.username)}
                    onMouseEnter={() => setHighlight(i)}
                  >
                    <div className="search-result-avatar">{initials}</div>
                    <div className="search-result-main">
                      <div className="search-result-name">
                        {r.display_name || r.username}
                        {r.verified && <span className="trust-chip" style={{ marginLeft: '6px', padding: '1px 6px', fontSize: '10px' }}>✓</span>}
                      </div>
                      <div className="search-result-handle">@{r.username}</div>
                    </div>
                    <span className="search-result-go">→</span>
                  </button>
                );
              })}
            </div>
          )}

          <p className="link-text" style={{ marginTop: '1.2rem' }}>
            Don&apos;t have a Hotname yet? <Link href="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </>
  );
}
