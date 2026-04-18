'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
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
        .select('username, display_name, phone_number, bio')
        .eq('id', user.id)
        .single();
      if (profile) {
        setUsername(profile.username ?? '');
        setDisplayName(profile.display_name ?? '');
        setPhoneNumber(profile.phone_number ?? '');
        setBio(profile.bio ?? '');
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
        body: JSON.stringify({ display_name: displayName, phone_number: phoneNumber, bio }),
      });

      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        setError(json.error || 'Failed to save settings.');
      } else {
        setSuccess('Saved.');
        setTimeout(() => setSuccess(''), 3000);
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
        <nav><Link href="/dashboard"><span className="logo">hot<span>name</span></span></Link></nav>
        <div className="form-wrap"><p style={{ color: '#888' }}>Loading…</p></div>
      </>
    );
  }

  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hot<span>name</span></span></Link>
        <Link href="/dashboard"><button className="btn-ghost">← Dashboard</button></Link>
      </nav>

      <div className="form-wrap">
        <div className="card">
          <h2>Settings</h2>
          <p className="sub">Update your public profile and contact details.</p>

          {error && <p className="error-msg">{error}</p>}
          {success && <p style={{ fontSize: '12px', color: '#22c55e', marginBottom: '10px' }}>{success}</p>}

          <form onSubmit={handleSave}>
            <div className="field">
              <label>Hotname (username)</label>
              <input
                type="text"
                value={`@${username}`}
                disabled
                style={{ opacity: 0.4, cursor: 'not-allowed' }}
              />
              <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>Usernames cannot be changed.</p>
            </div>

            <div className="field">
              <label>Display name</label>
              <input
                type="text"
                placeholder="Your full name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                required
              />
            </div>

            <div className="field">
              <label>Bio <span style={{ color: '#555' }}>({bio.length}/300)</span></label>
              <textarea
                rows={3}
                placeholder="A short bio shown on your public profile page…"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 300))}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="field">
              <label>Phone number <span style={{ color: '#555' }}>(E.164 — e.g. +447911123456)</span></label>
              <input
                type="tel"
                placeholder="+447911123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                pattern="\+[0-9]{7,15}"
                title="E.164 format: start with + and country code"
              />
              <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                Required to receive messages via SMS or WhatsApp.
              </p>
            </div>

            <button className="btn-primary" type="submit" disabled={saving} style={{ width: '100%', marginTop: '0.5rem' }}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
