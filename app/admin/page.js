import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isAdmin } from '@/lib/admin';
import RenameForm from './RenameForm';

export const metadata = { title: 'Admin — Hotname' };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!isAdmin(user.id)) notFound();

  const service = createServiceClient();
  const { data: profiles = [] } = await service
    .from('profiles')
    .select('id, username, display_name, email, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hotname<span className="logo-dot" /></span></Link>
        <div className="nav-actions">
          <Link href="/dashboard"><button className="btn-ghost">← Dashboard</button></Link>
        </div>
      </nav>

      <div className="page">
        <h2 style={{ marginTop: 0 }}>Admin</h2>
        <RenameForm />

        <h2>Recent profiles</h2>
        {profiles.length === 0 ? (
          <p className="empty">No profiles yet.</p>
        ) : (
          <div className="req-list">
            {profiles.map((p) => (
              <div key={p.id} className="req-card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>
                      @{p.username ?? '—'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.display_name || '(no name)'} · {p.email}
                    </div>
                  </div>
                  <span className="req-age">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
