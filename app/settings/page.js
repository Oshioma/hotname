'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const MAX_BIO = 140;

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, phone_number, bio, location')
        .eq('id', user.id)
        .single();
      if (profile) {
        setUsername(profile.username ?? '');
        setDisplayName(profile.display_name ?? '');
        setPhoneNumber(profile.phone_number ?? '');
        setBio(profile.bio ?? '');
        setLocation(profile.location ?? '');
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, phone_number: phoneNumber, bio, location }),
      });

      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        setError(json.error || 'Failed to save settings.');
      } else {
        setSuccess('Saved.');
        setTimeout(() => setSuccess(''), 2500);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <nav>
          <Link href="/dashboard"><span className="logo">hotname<span className="logo-dot" /></span></Link>
        </nav>
        <div className="form-wrap"><p style={{ color: 'var(--text-muted)' }}>Loading…</p></div>
      </>
    );
  }

  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hotname<span className="logo-dot" /></span></Link>
        <div className="nav-actions">
          <Link href="/dashboard"><button className="btn-ghost">← Dashboard</button></Link>
        </div>
      </nav>

      <div className="form-wrap">
        <div className="card">
          <h2>Profile</h2>
          <p className="sub">What people see when they visit your Hotname.</p>

          {error && <p className="error-msg">{error}</p>}
          {success && <p style={{ fontSize: '12px', color: 'var(--ok)', marginBottom: '10px' }}>{success}</p>}

          <form onSubmit={handleSave}>
            <div className="field">
              <label>Hotname</label>
              <input
                type="text"
                value={`@${username}`}
                disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '4px' }}>
                Hotnames are permanent.
              </p>
            </div>

            <div className="field">
              <label>Display name</label>
              <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                required
              />
            </div>

            <div className="field">
              <label>Status <span style={{ color: 'var(--text-soft)' }}>({bio.length}/{MAX_BIO})</span></label>
              <textarea
                rows={2}
                placeholder="Founder · Builder · Zanzibar / UK"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="field">
              <label>Location <span style={{ color: 'var(--text-soft)' }}>(optional)</span></label>
              <input
                type="text"
                placeholder="City, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={80}
              />
            </div>

            <div className="field">
              <label>Phone <span style={{ color: 'var(--text-soft)' }}>(E.164)</span></label>
              <input
                type="tel"
                placeholder="+447911123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                pattern="\+[0-9]{7,15}"
                title="E.164 format: start with + and country code"
              />
              <p style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '4px' }}>
                Used privately to notify you about approved WhatsApp / SMS requests. Never shown unless you make it a channel.
              </p>
            </div>

            <button className="btn-primary" type="submit" disabled={saving} style={{ width: '100%', marginTop: '0.5rem' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
