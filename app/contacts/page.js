'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addUsername, setAddUsername] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const json = await res.json();
        setContacts(json.contacts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  async function handleAdd(e) {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    const username = addUsername.trim().replace(/^@/, '').toLowerCase();
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_username: username }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error || 'Failed to add contact.');
      } else {
        setAddUsername('');
        fetchContacts();
      }
    } catch {
      setAddError('Network error.');
    } finally {
      setAdding(false);
    }
  }

  async function toggleFavorite(username, current) {
    await fetch('/api/contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_username: username, is_favorite: !current }),
    });
    fetchContacts();
  }

  async function removeContact(username) {
    await fetch('/api/contacts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_username: username }),
    });
    fetchContacts();
  }

  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hot<span>name</span></span></Link>
        <Link href="/dashboard"><button className="btn-ghost">← Dashboard</button></Link>
      </nav>

      <div className="dash">
        <h2>Contacts</h2>

        {/* Add contact */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '1rem' }}>Add someone by their hotname.</p>
          {addError && <p className="error-msg">{addError}</p>}
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px' }}>
            <div className="prefix" style={{ flex: 1 }}>
              <span className="at">@</span>
              <input
                type="text"
                placeholder="username"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                required
              />
            </div>
            <button className="btn-primary" type="submit" disabled={adding} style={{ flexShrink: 0 }}>
              {adding ? '…' : 'Add'}
            </button>
          </form>
        </div>

        {/* Contact list */}
        {loading ? (
          <p className="empty">Loading…</p>
        ) : contacts.length === 0 ? (
          <p className="empty">No contacts yet. Add someone above or they&apos;ll appear after you message them.</p>
        ) : (
          <div className="contacts-list">
            {contacts.map((c) => (
              <div key={c.id} className="contact-row">
                <div className="contact-info">
                  <div className="chip-name">{c.profiles?.display_name || `@${c.contact_username}`}</div>
                  <div className="chip-user">@{c.contact_username}</div>
                </div>
                <div className="contact-actions">
                  <Link href={`/compose?to=${c.contact_username}`}>
                    <button className="btn-ghost" style={{ fontSize: '12px' }}>Message</button>
                  </Link>
                  <button
                    className={`btn-star${c.is_favorite ? ' active' : ''}`}
                    onClick={() => toggleFavorite(c.contact_username, c.is_favorite)}
                    title={c.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {c.is_favorite ? '★' : '☆'}
                  </button>
                  <button
                    className="btn-ghost btn-danger"
                    onClick={() => removeContact(c.contact_username)}
                    title="Remove contact"
                    style={{ fontSize: '12px' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
