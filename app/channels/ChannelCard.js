'use client';

import { useState } from 'react';

const META = {
  whatsapp: { label: 'WhatsApp', icon: '💬', desc: 'Receive messages via WhatsApp', needsPhone: true },
  sms:      { label: 'SMS',      icon: '📱', desc: 'Receive messages via SMS text', needsPhone: true },
  email:    { label: 'Email',    icon: '✉️',  desc: 'Receive messages via email',    needsPhone: false },
  post:     { label: 'Post',     icon: '📮', desc: 'Receive letters — we print and mail them anonymously', needsPhone: false },
};

export default function ChannelCard({ channel, onRefresh }) {
  const meta = META[channel.type];

  // Toggle / enable flow
  const [toggling, setToggling]       = useState(false);

  // Phone verify flow (whatsapp / sms)
  const [phoneInput, setPhoneInput]   = useState(channel.value ?? '');
  const [codeSent, setCodeSent]       = useState(false);
  const [codeInput, setCodeInput]     = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Value editing (email / post)
  const [valueInput, setValueInput]   = useState(channel.value ?? '');
  const [valueSaving, setValueSaving] = useState(false);
  const [valueError, setValueError]   = useState('');

  // Default access
  const [accessSaving, setAccessSaving] = useState(false);

  // Access list
  const [addUsername, setAddUsername] = useState('');
  const [addingUser, setAddingUser]   = useState(false);
  const [addError, setAddError]       = useState('');

  // ── Helpers ──────────────────────────────────────────────────────────────

  async function patchChannel(updates) {
    const res = await fetch('/api/channels', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: channel.type, ...updates }),
    });
    return res.ok;
  }

  // ── Toggle ────────────────────────────────────────────────────────────────

  async function handleToggle() {
    if (channel.enabled) {
      // Disable immediately
      setToggling(true);
      await patchChannel({ enabled: false });
      await onRefresh();
      setToggling(false);
    }
    // Enabling is handled by the verify/save flow below
  }

  // ── Phone verify (WhatsApp / SMS) ─────────────────────────────────────────

  async function handleSendCode(e) {
    e.preventDefault();
    setVerifyError('');
    setVerifyLoading(true);
    try {
      const res = await fetch('/api/channels/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', type: channel.type, phone: phoneInput }),
      });
      const json = await res.json();
      if (!res.ok) { setVerifyError(json.error); return; }
      setCodeSent(true);
    } catch { setVerifyError('Network error.'); }
    finally { setVerifyLoading(false); }
  }

  async function handleCheckCode(e) {
    e.preventDefault();
    setVerifyError('');
    setVerifyLoading(true);
    try {
      const res = await fetch('/api/channels/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', type: channel.type, phone: phoneInput, code: codeInput }),
      });
      const json = await res.json();
      if (!res.ok) { setVerifyError(json.error); return; }
      setCodeSent(false);
      setCodeInput('');
      await onRefresh();
    } catch { setVerifyError('Network error.'); }
    finally { setVerifyLoading(false); }
  }

  // ── Value save (email / post) ─────────────────────────────────────────────

  async function handleValueSave(e) {
    e.preventDefault();
    setValueError('');
    setValueSaving(true);
    const ok = await patchChannel({ value: valueInput, enabled: true });
    if (!ok) setValueError('Failed to save. Please try again.');
    else await onRefresh();
    setValueSaving(false);
  }

  // ── Default access ────────────────────────────────────────────────────────

  async function handleAccessChange(val) {
    setAccessSaving(true);
    await patchChannel({ default_access: val });
    await onRefresh();
    setAccessSaving(false);
  }

  // ── Access list ───────────────────────────────────────────────────────────

  async function handleAddUser(e) {
    e.preventDefault();
    setAddError('');
    setAddingUser(true);
    const username = addUsername.trim().replace(/^@/, '').toLowerCase();
    try {
      const res = await fetch('/api/channels/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: channel.type, username }),
      });
      const json = await res.json();
      if (!res.ok) { setAddError(json.error); return; }
      setAddUsername('');
      await onRefresh();
    } catch { setAddError('Network error.'); }
    finally { setAddingUser(false); }
  }

  async function handleRemoveUser(username) {
    await fetch('/api/channels/access', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: channel.type, username }),
    });
    await onRefresh();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showEnableForm = !channel.enabled;
  const needsVerify    = meta.needsPhone && (!channel.verified || !channel.value);

  return (
    <div className={`ch-card${channel.enabled ? ' ch-on' : ''}`}>
      {/* Header row */}
      <div className="ch-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>{meta.icon}</span>
          <div>
            <p className="ch-label">{meta.label}</p>
            <p className="ch-desc">{meta.desc}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {channel.enabled && channel.verified && (
            <span className="ch-verified">✓ verified</span>
          )}
          <button
            className={`ch-toggle${channel.enabled ? ' on' : ''}`}
            onClick={handleToggle}
            disabled={toggling}
            aria-label={channel.enabled ? 'Disable' : 'Enable'}
          >
            <span className="ch-toggle-knob" />
          </button>
        </div>
      </div>

      {/* Enable flow */}
      {showEnableForm && (
        <div className="ch-body">
          {meta.needsPhone ? (
            !codeSent ? (
              <form onSubmit={handleSendCode} className="ch-form">
                {verifyError && <p className="error-msg">{verifyError}</p>}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="tel"
                    placeholder="+447911123456"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    pattern="\+[0-9]{7,15}"
                    required
                    className="ch-input"
                  />
                  <button className="btn-primary" type="submit" disabled={verifyLoading} style={{ fontSize: '13px', padding: '8px 16px' }}>
                    {verifyLoading ? 'Sending…' : 'Send code'}
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: '#555', marginTop: '6px' }}>We&apos;ll send a 6-digit code to verify your number.</p>
              </form>
            ) : (
              <form onSubmit={handleCheckCode} className="ch-form">
                {verifyError && <p className="error-msg">{verifyError}</p>}
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>Code sent to {phoneInput}.</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="6-digit code"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    maxLength={6}
                    required
                    autoFocus
                    className="ch-input"
                    style={{ maxWidth: '140px', letterSpacing: '4px', textAlign: 'center' }}
                  />
                  <button className="btn-primary" type="submit" disabled={verifyLoading} style={{ fontSize: '13px', padding: '8px 16px' }}>
                    {verifyLoading ? 'Checking…' : 'Verify'}
                  </button>
                  <button type="button" className="btn-ghost" style={{ fontSize: '13px' }} onClick={() => setCodeSent(false)}>
                    Back
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleValueSave} className="ch-form">
              {valueError && <p className="error-msg">{valueError}</p>}
              {channel.type === 'post' ? (
                <textarea
                  rows={3}
                  placeholder="Full postal address…"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  required
                  className="ch-input"
                  style={{ resize: 'vertical', width: '100%' }}
                />
              ) : (
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  required
                  className="ch-input"
                />
              )}
              <button className="btn-primary" type="submit" disabled={valueSaving} style={{ marginTop: '8px', fontSize: '13px', padding: '8px 16px' }}>
                {valueSaving ? 'Saving…' : 'Enable'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Enabled settings */}
      {channel.enabled && (
        <div className="ch-body">
          {/* Current value summary */}
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
            {channel.type === 'post' ? '📍 Address saved' : channel.value}
            {' '}·{' '}
            <button
              className="ch-text-btn"
              onClick={() => { setCodeSent(false); setCodeInput(''); patchChannel({ enabled: false, verified: false, value: null }).then(onRefresh); }}
            >
              Change
            </button>
          </p>

          {/* Default visibility */}
          <p className="ch-section-label">Who can see this channel</p>
          <div className="ch-radio-group">
            {['everyone', 'selected'].map((opt) => (
              <label key={opt} className={`ch-radio${channel.default_access === opt ? ' on' : ''}`}>
                <input
                  type="radio"
                  name={`access-${channel.type}`}
                  value={opt}
                  checked={channel.default_access === opt}
                  onChange={() => handleAccessChange(opt)}
                  disabled={accessSaving}
                />
                {opt === 'everyone' ? '🌍 Everyone' : '🔒 Selected people only'}
              </label>
            ))}
          </div>

          {/* Access list (shown when 'selected') */}
          {channel.default_access === 'selected' && (
            <div style={{ marginTop: '12px' }}>
              <p className="ch-section-label">Authorised users</p>
              {channel.access_list.length === 0 && (
                <p style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>No one added yet — this channel is hidden from everyone.</p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {channel.access_list.map((u) => (
                  <span key={u} className="ch-user-chip">
                    @{u}
                    <button className="ch-user-remove" onClick={() => handleRemoveUser(u)} title="Remove">✕</button>
                  </span>
                ))}
              </div>
              {addError && <p className="error-msg" style={{ marginBottom: '6px' }}>{addError}</p>}
              <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div className="prefix" style={{ flex: 1, minWidth: '160px' }}>
                  <span className="at">@</span>
                  <input
                    type="text"
                    placeholder="username"
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    required
                  />
                </div>
                <button className="btn-ghost" type="submit" disabled={addingUser} style={{ fontSize: '13px' }}>
                  {addingUser ? '…' : 'Add'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
