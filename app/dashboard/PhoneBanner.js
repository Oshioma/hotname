'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PhoneBanner() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone }),
      });
      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setError(json.error || 'Could not save. Please try again.');
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="phone-banner">
      <div className="phone-banner-inner">
        <span className="phone-banner-icon">📲</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 500, fontSize: '13px', marginBottom: open ? '10px' : 0 }}>
            Add your phone number to receive WhatsApp &amp; SMS messages
          </p>

          {open && (
            <form onSubmit={handleSave} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="tel"
                placeholder="+447911123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                pattern="\+[0-9]{7,15}"
                title="E.164 format: start with + and country code"
                required
                autoFocus
                style={{
                  background: '#0f0f0f',
                  border: '0.5px solid #444',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#f0f0f0',
                  fontSize: '13px',
                  outline: 'none',
                  flex: 1,
                  minWidth: '180px',
                  fontFamily: 'inherit',
                }}
              />
              <button className="btn-primary" type="submit" disabled={saving} style={{ padding: '8px 18px', fontSize: '13px' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)} style={{ fontSize: '13px' }}>
                Cancel
              </button>
            </form>
          )}

          {error && <p style={{ fontSize: '12px', color: '#ff5c3a', marginTop: '6px' }}>{error}</p>}
        </div>

        {!open && (
          <button className="btn-primary" onClick={() => setOpen(true)} style={{ fontSize: '13px', padding: '8px 16px', flexShrink: 0 }}>
            Add number
          </button>
        )}
      </div>
    </div>
  );
}
