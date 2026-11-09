'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ProfileCard from '@/app/components/ProfileCard';

/**
 * Home-page search. Type a name → live results. Tap a result (or press
 * Enter for the top one) and that Hotname's profile opens right here —
 * the same card /<username> shows: public contact details, connect,
 * and the message composer.
 */
export default function HomeSearch() {
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [openUsername, setOpenUsername] = useState(null);
  const [view, setView] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState('');

  const abortRef = useRef(null);
  const viewAbortRef = useRef(null);

  // Live search
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

  async function openProfile(username) {
    setOpenUsername(username);
    setView(null);
    setViewError('');
    setViewLoading(true);
    try {
      if (viewAbortRef.current) viewAbortRef.current.abort();
      viewAbortRef.current = new AbortController();
      const res = await fetch(`/api/lookup?u=${encodeURIComponent(username)}`, {
        signal: viewAbortRef.current.signal,
        cache: 'no-store',
      });
      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }
      if (!res.ok) { setViewError(json.error || 'Could not load this Hotname.'); return; }
      setView(json);
    } catch (e) {
      if (e?.name !== 'AbortError') setViewError('Network error. Try again.');
    } finally {
      setViewLoading(false);
    }
  }

  function closeProfile() {
    if (viewAbortRef.current) viewAbortRef.current.abort();
    setOpenUsername(null);
    setView(null);
    setViewError('');
    setViewLoading(false);
  }

  function handleChange(e) {
    setValue(e.target.value);
    if (openUsername) closeProfile();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && results.length > 0 && !openUsername) {
      e.preventDefault();
      openProfile(results[0].username);
    }
    if (e.key === 'Escape' && openUsername) closeProfile();
  }

  const queryLength = value.trim().replace(/^@/, '').length;
  const openResult = results.find((r) => r.username === openUsername);

  return (
    <div className="home-search">
      <div className="search-input">
        <span className="at">@</span>
        <input
          type="text"
          placeholder="Find a Hotname…"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          aria-label="Find a Hotname"
        />
      </div>

      {queryLength >= 2 && !openUsername && (
        <div className="home-search-results">
          {loading && results.length === 0 && <div className="search-empty">Searching…</div>}
          {!loading && results.length === 0 && <div className="search-empty">No Hotnames match that.</div>}
          {results.map((r) => {
            const initials = (r.display_name || r.username)
              .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
            return (
              <div key={r.username} className="home-search-row">
                <button
                  type="button"
                  className="search-result"
                  onClick={() => openProfile(r.username)}
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
                  onClick={() => openProfile(r.username)}
                >
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}

      {openUsername && (
        <div className="home-search-profile">
          <div className="home-search-profile-bar">
            <button type="button" className="btn-ghost home-search-back" onClick={closeProfile}>
              ← {results.length > 1 ? 'All results' : 'Back'}
            </button>
            <Link href={`/${openUsername}`} className="home-search-open-page">
              hotname.co.uk/{openUsername} ↗
            </Link>
          </div>

          {viewLoading && (
            <div className="search-empty">
              Opening @{openResult?.username ?? openUsername}…
            </div>
          )}
          {viewError && (
            <div className="search-empty">
              {viewError}{' '}
              <button type="button" className="link-btn" onClick={() => openProfile(openUsername)}>
                Retry
              </button>
            </div>
          )}
          {view && <ProfileCard view={view} compact />}
        </div>
      )}
    </div>
  );
}
