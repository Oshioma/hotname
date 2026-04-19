'use client';

import { useState } from 'react';
import { ACCESS_MODES, ACCESS_LABEL } from '@/lib/channelMeta';

const PHONE_KINDS = new Set(['phone']);

export default function ChannelRow({ channel, onRefresh }) {
  const [valueInput, setValueInput] = useState(channel.value ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // verify (phone-kind channels)
  const [codeSent, setCodeSent] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  // allowlist
  const [addUser, setAddUser] = useState('');
  const [addError, setAddError] = useState('');

  const isPhone = PHONE_KINDS.has(channel.kind);
  const needsValue = !channel.value;

  async function patch(updates) {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: channel.type, ...updates }),
      });
      let json = {};
      try { json = await res.json(); } catch { /* ignore */ }
      if (!res.ok) { setError(json.error || 'Failed to save.'); return false; }
      await onRefresh();
      return true;
    } catch { setError('Network error.'); return false; }
    finally { setSaving(false); }
  }

  async function handleSaveValue() {
    if (!valueInput.trim()) return;
    await patch({ value: valueInput.trim() });
  }

  async function handleSetMode(mode) {
    if (mode !== 'hidden' && !channel.value && !valueInput.trim()) {
      setError(`Add a ${channel.label} detail first.`);
      return;
    }
    const payload = { access_mode: mode };
    if (!channel.value && valueInput.trim()) payload.value = valueInput.trim();
    await patch(payload);
  }

  async function handleSendCode() {
    if (!valueInput.trim()) return;
    setError('');
    setVerifying(true);
    try {
      const res = await fetch('/api/channels/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', type: channel.type, phone: valueInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setCodeSent(true);
      await onRefresh();
    } catch { setError('Network error.'); }
    finally { setVerifying(false); }
  }

  async function handleCheckCode() {
    setError('');
    setVerifying(true);
    try {
      const res = await fetch('/api/channels/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', type: channel.type, phone: valueInput.trim(), code: codeInput }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setCodeSent(false);
      setCodeInput('');
      await onRefresh();
    } catch { setError('Network error.'); }
    finally { setVerifying(false); }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setAddError('');
    const uname = addUser.trim().replace(/^@/, '').toLowerCase();
    if (!uname) return;
    try {
      const res = await fetch('/api/channels/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: channel.type, username: uname }),
      });
      const json = await res.json();
      if (!res.ok) { setAddError(json.error); return; }
      setAddUser('');
      await onRefresh();
    } catch { setAddError('Network error.'); }
  }

  async function handleRemoveUser(uname) {
    await fetch('/api/channels/access', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: channel.type, username: uname }),
    });
    await onRefresh();
  }

  const isVisible = channel.access_mode !== 'hidden';

  return (
    <div className={`ch-row${isVisible ? ' active' : ''}`}>
      <div className="ch-row-head">
        <div className="ch-row-main">
          <div>
            <div className="ch-row-label">{channel.label}</div>
            {channel.value && (
              <div className="ch-row-value">
                {channel.value}
                {channel.verified && <span className="trust-chip" style={{ marginLeft: '8px' }}>✓ verified</span>}
              </div>
            )}
            {!channel.value && (
              <div className="ch-row-value" style={{ fontFamily: 'inherit', color: 'var(--text-soft)' }}>
                {channel.hint}
              </div>
            )}
          </div>
        </div>
        <span className={`access-badge ${channel.access_mode === 'hidden' ? 'selected' : channel.access_mode}`}>
          {ACCESS_LABEL[channel.access_mode]}
        </span>
      </div>

      {error && <p className="error-msg" style={{ marginTop: '12px' }}>{error}</p>}

      {/* Value input / verify */}
      {needsValue || !channel.value ? (
        <div className="ch-detail">
          <div className="ch-detail-label">
            {channel.kind === 'phone'  ? 'Phone (E.164)' :
             channel.kind === 'email'  ? 'Email' :
             channel.kind === 'url'    ? 'URL' :
             'Handle / username'}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              className="ch-input"
              style={{ flex: 1, minWidth: '200px' }}
              value={valueInput}
              placeholder={
                channel.kind === 'phone'  ? '+447911123456' :
                channel.kind === 'email'  ? 'you@example.com' :
                channel.kind === 'url'    ? 'https://…' :
                '@yourname'
              }
              onChange={(e) => setValueInput(e.target.value)}
            />
            {isPhone ? (
              !codeSent ? (
                <button className="btn-ghost" disabled={verifying} onClick={handleSendCode}>
                  {verifying ? '…' : 'Verify'}
                </button>
              ) : (
                <>
                  <input
                    className="ch-input"
                    style={{ width: '120px', textAlign: 'center', letterSpacing: '4px' }}
                    maxLength={6}
                    placeholder="000000"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                  />
                  <button className="btn-primary" disabled={verifying} onClick={handleCheckCode}>
                    {verifying ? '…' : 'Check'}
                  </button>
                </>
              )
            ) : (
              <button className="btn-ghost" disabled={saving || !valueInput.trim()} onClick={handleSaveValue}>
                {saving ? '…' : 'Save'}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Access picker */}
      <div className="ch-detail">
        <div className="ch-detail-label">Who can see this channel</div>
        <div className="access-pick">
          {ACCESS_MODES.map((mode) => (
            <button
              key={mode}
              className={`access-pick-btn${channel.access_mode === mode ? ' on' : ''}`}
              disabled={saving}
              onClick={() => handleSetMode(mode)}
            >
              {ACCESS_LABEL[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Allowlist (only when selected) */}
      {channel.access_mode === 'selected' && (
        <div className="ch-detail">
          <div className="ch-detail-label">Allowed usernames</div>
          {channel.access_list.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '8px' }}>
              No one added — this channel is hidden from everyone.
            </p>
          ) : (
            <div className="chip-row">
              {channel.access_list.map((u) => (
                <span key={u} className="chip">
                  @{u}
                  <button onClick={() => handleRemoveUser(u)} aria-label="Remove">✕</button>
                </span>
              ))}
            </div>
          )}

          {addError && <p className="error-msg" style={{ marginBottom: '6px' }}>{addError}</p>}
          <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '8px' }}>
            <div className="prefix" style={{ flex: 1 }}>
              <span className="at">@</span>
              <input
                className="ch-input"
                style={{ paddingLeft: '26px' }}
                placeholder="username"
                value={addUser}
                onChange={(e) => setAddUser(e.target.value)}
              />
            </div>
            <button className="btn-ghost" type="submit">Add</button>
          </form>
        </div>
      )}

      {/* Change value */}
      {channel.value && (
        <div style={{ marginTop: '10px' }}>
          <button
            className="btn-quiet"
            style={{ fontSize: '12px' }}
            onClick={() => { patch({ value: null }); }}
          >
            Remove detail
          </button>
        </div>
      )}
    </div>
  );
}
