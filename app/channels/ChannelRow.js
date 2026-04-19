'use client';

import { useEffect, useState } from 'react';
import { ACCESS_MODES, ACCESS_LABEL } from '@/lib/channelMeta';

const MODE_ORDER = ['hidden', 'request', 'selected', 'open']; // display order, Off → Public

/**
 * One compact row per channel:
 *   [ Label ]  [ value input (prefilled) + inline Verify if phone ]  [ Off · Request · Invite · Public ]
 * If mode === 'selected', an allowlist editor expands below.
 */
export default function ChannelRow({ channel, profileDefaults, onRefresh }) {
  const prefill =
    channel.value ??
    (channel.kind === 'phone' ? profileDefaults?.phone : null) ??
    (channel.kind === 'email' ? profileDefaults?.email : null) ??
    '';

  const [valueInput, setValueInput] = useState(prefill);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Keep the input in sync when a parent refresh changes channel.value
  useEffect(() => { setValueInput(prefill); /* eslint-disable-next-line */ }, [channel.value]);

  const [codeSent, setCodeSent] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [addUser, setAddUser] = useState('');
  const [addError, setAddError] = useState('');

  const isPhone = channel.kind === 'phone';
  const valueClean = valueInput.trim();
  const storedEqualsInput = (channel.value ?? '') === valueClean;

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

  async function saveValueIfChanged() {
    if (!valueClean) {
      if (channel.value) await patch({ value: null });
      return;
    }
    if (!storedEqualsInput) await patch({ value: valueClean });
  }

  async function handleSetMode(mode) {
    if (mode === 'hidden') { await patch({ access_mode: 'hidden' }); return; }
    if (!valueClean) { setError(`Add a ${channel.label} detail first.`); return; }
    const payload = { access_mode: mode };
    if (!storedEqualsInput) payload.value = valueClean;
    await patch(payload);
  }

  async function handleSendCode() {
    if (!valueClean) return;
    setError(''); setVerifying(true);
    try {
      const res = await fetch('/api/channels/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', type: channel.type, phone: valueClean }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setCodeSent(true);
      await onRefresh();
    } catch { setError('Network error.'); }
    finally { setVerifying(false); }
  }

  async function handleCheckCode() {
    setError(''); setVerifying(true);
    try {
      const res = await fetch('/api/channels/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', type: channel.type, phone: valueClean, code: codeInput }),
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

  const placeholder =
    channel.kind === 'phone'   ? '+447911123456' :
    channel.kind === 'email'   ? 'you@example.com' :
    channel.kind === 'url'     ? 'https://…' :
    channel.kind === 'address' ? 'Name\nStreet\nCity, Postcode\nCountry' :
                                 '@username';

  return (
    <div className={`ch-simple${channel.access_mode !== 'hidden' ? ' ch-simple-on' : ''}`}>
      <div className="ch-simple-label">{channel.label}</div>

      <div className="ch-simple-value">
        {channel.kind === 'address' ? (
          <textarea
            className="ch-simple-input ch-simple-textarea"
            rows={3}
            value={valueInput}
            placeholder={placeholder}
            onChange={(e) => setValueInput(e.target.value)}
            onBlur={saveValueIfChanged}
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck="false"
          />
        ) : (
          <input
            className="ch-simple-input"
            value={valueInput}
            placeholder={placeholder}
            onChange={(e) => setValueInput(e.target.value)}
            onBlur={saveValueIfChanged}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
        )}
        {isPhone && valueClean && !codeSent && (
          channel.verified && storedEqualsInput ? (
            <span className="ch-simple-check" title="Verified">✓</span>
          ) : (
            <button
              type="button"
              className="btn-quiet ch-simple-verify"
              disabled={verifying}
              onClick={handleSendCode}
            >
              {verifying ? '…' : 'Verify'}
            </button>
          )
        )}
      </div>

      <div className="ch-simple-pills">
        {MODE_ORDER.map((mode) => (
          <button
            key={mode}
            type="button"
            className={`pill${channel.access_mode === mode ? ' pill-on' : ''}${mode === 'hidden' ? ' pill-off' : ''}`}
            disabled={saving}
            onClick={() => handleSetMode(mode)}
            title={
              mode === 'open' && channel.private_value
                ? 'Anyone can send — your address stays private'
                : ACCESS_LABEL[mode]
            }
          >
            {ACCESS_LABEL[mode]}
          </button>
        ))}
      </div>

      {channel.private_value && channel.access_mode !== 'hidden' && (
        <div className="ch-simple-note">
          🔒 Your address stays private — we send the post for you.
        </div>
      )}

      {error && <div className="ch-simple-error">{error}</div>}

      {isPhone && codeSent && (
        <div className="ch-simple-sub">
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Code sent to {valueClean}:</span>
          <input
            className="ch-simple-input"
            style={{ width: '100px', letterSpacing: '4px', textAlign: 'center' }}
            maxLength={6}
            placeholder="000000"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
          />
          <button className="btn-primary" disabled={verifying} onClick={handleCheckCode}>
            {verifying ? '…' : 'Check'}
          </button>
          <button className="btn-quiet" onClick={() => { setCodeSent(false); setCodeInput(''); }}>Cancel</button>
        </div>
      )}

      {channel.access_mode === 'selected' && (
        <div className="ch-simple-sub ch-simple-allowlist">
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Visible to:</span>
          {channel.access_list.length === 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>no-one yet</span>
          )}
          {channel.access_list.map((u) => (
            <span key={u} className="chip">
              @{u}
              <button onClick={() => handleRemoveUser(u)} aria-label="Remove">✕</button>
            </span>
          ))}
          {addError && <span className="ch-simple-error" style={{ width: '100%' }}>{addError}</span>}
          <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
            <div className="prefix">
              <span className="at">@</span>
              <input
                className="ch-simple-input"
                style={{ paddingLeft: '22px', width: '140px' }}
                placeholder="username"
                value={addUser}
                onChange={(e) => setAddUser(e.target.value)}
              />
            </div>
            <button className="btn-quiet" type="submit">Add</button>
          </form>
        </div>
      )}
    </div>
  );
}
