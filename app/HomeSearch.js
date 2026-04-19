'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeSearch({ viewerLoggedIn }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestState, setRequestState] = useState({}); // username → 'loading' | 'sent' | 'error'
  const abortRef = useRef(null);

  useEffect(() => {
    const q = value.trim().replace(/^@/, '');
    if (q.length < 2) { setResults([]); setLoading(false); return; }
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
      } catch { /* aborted */ }
      finally { setLoading(false); }
    }, 180);
    return () => clearTimeout(timer);
  }, [value]);

  async function handleRequest(username) {
    if (!viewerLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/${username}`)}`);
      return;
    }
    setRequestState((s) => ({ ...s, [username]: 'loading' }));
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_username: username }),
      });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/${username}`)}`);
        return;
      }
      setRequestState((s) => ({ ...s, [username]: res.ok ? 'sent' : 'error' }));
    } catch {
      setRequestState((s) => ({ ...s, [username]: 'error' }));
    }
  }

  const queryLength = value.trim().replace(/^@/, '').length;

  return (
    <div className="home-search">
      <div className="search-input">
        <span className="at">@</span>
        <input
          type="text"
          placeholder="Find a Hotname…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
        />
      </div>

      {queryLength >= 2 && (
        <div className="home-search-results">
          {loading && results.length === 0 && <div className="search-empty">Searching…</div>}
          {!loading && results.length === 0 && <div className="search-empty">No Hotnames match that.</div>}
          {results.map((r) => {
            const initials = (r.display_name || r.username)
              .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
            const state = requestState[r.username];
            return (
              <div key={r.username} className="home-search-row">
                <button
                  type="button"
                  className="search-result"
                  onClick={() => router.push(`/${r.username}`)}
                >
                  <div className="search-result-avatar">{initials}</div>
                  <div className="search-result-main">
                    <div className="search-result-name">{r.display_name || r.username}</div>
                    <div className="search-result-handle">@{r.username}</div>
                  </div>
                </button>
                <button
                  type="button"
                  className="btn-primary home-search-request"
                  onClick={() => handleRequest(r.username)}
                  disabled={state === 'loading' || state === 'sent'}
                >
                  {state === 'sent'    ? 'Requested' :
                   state === 'loading' ? 'Sending…'  :
                   state === 'error'   ? 'Try again' : 'Request'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
