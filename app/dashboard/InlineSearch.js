'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Compact live search for anywhere on the app (currently: dashboard).
 * Press Enter or click a result to open the Hotname profile.
 */
export default function InlineSearch({ placeholder = 'Find a Hotname…', autoFocus = false }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [focused, setFocused] = useState(false);
  const abortRef = useRef(null);
  const containerRef = useRef(null);

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
        setHighlight(0);
      } catch { /* aborted */ }
      finally { setLoading(false); }
    }, 180);
    return () => clearTimeout(timer);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function goToUsername(username) {
    router.push(`/${username}`);
    setValue('');
    setResults([]);
    setFocused(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (results[highlight]) { goToUsername(results[highlight].username); return; }
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
    } else if (e.key === 'Escape') {
      setFocused(false);
      e.currentTarget.blur();
    }
  }

  const queryLength = value.trim().replace(/^@/, '').length;
  const showDropdown = focused && queryLength >= 2;

  return (
    <div ref={containerRef} className="inline-search">
      <form onSubmit={handleSubmit}>
        <div className="search-input">
          <span className="at">@</span>
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {value && <button type="submit">Go</button>}
        </div>
      </form>

      {showDropdown && (
        <div className="inline-search-dropdown">
          {loading && results.length === 0 && <div className="search-empty">Searching…</div>}
          {!loading && results.length === 0 && <div className="search-empty">No Hotnames match that.</div>}
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
          <Link href="/find" className="inline-search-more" onClick={() => setFocused(false)}>
            Advanced search →
          </Link>
        </div>
      )}
    </div>
  );
}
