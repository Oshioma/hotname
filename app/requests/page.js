import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import RequestCard from './RequestCard';

export default async function RequestsPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const filter =
    sp.filter === 'all'      ? 'all' :
    sp.filter === 'resolved' ? 'resolved' :
    sp.filter === 'deleted'  ? 'deleted' :
                               'pending';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let query = supabase
    .from('connection_requests')
    .select('id, requester_username, channel_type, reason, status, created_at, deleted_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(60);

  if (filter === 'deleted') {
    query = query.not('deleted_at', 'is', null);
  } else {
    query = query.is('deleted_at', null);
    if (filter === 'pending')  query = query.eq('status', 'pending');
    if (filter === 'resolved') query = query.neq('status', 'pending');
  }

  const { data: requests = [] } = await query;

  return (
    <>
      <nav>
        <Link href="/dashboard"><span className="logo">hotname<span className="logo-dot" /></span></Link>
        <div className="nav-actions">
          <Link href="/dashboard"><button className="btn-ghost">← Dashboard</button></Link>
        </div>
      </nav>

      <div className="page">
        <h2 style={{ marginTop: 0 }}>Requests</h2>

        <div className="tab-row">
          <Link href="/requests?filter=pending">
            <button className={`tab${filter === 'pending' ? ' active' : ''}`}>Pending</button>
          </Link>
          <Link href="/requests?filter=resolved">
            <button className={`tab${filter === 'resolved' ? ' active' : ''}`}>Resolved</button>
          </Link>
          <Link href="/requests?filter=all">
            <button className={`tab${filter === 'all' ? ' active' : ''}`}>All</button>
          </Link>
          <Link href="/requests?filter=deleted">
            <button className={`tab${filter === 'deleted' ? ' active' : ''}`}>Deleted</button>
          </Link>
        </div>

        {requests.length === 0 ? (
          <p className="empty">
            {filter === 'pending'  ? "No pending requests. You're all caught up." :
             filter === 'deleted'  ? "Nothing in Deleted." :
                                     "Nothing here yet."}
          </p>
        ) : (
          <div className="req-list">
            {requests.map((r) => <RequestCard key={r.id} request={r} />)}
          </div>
        )}
      </div>
    </>
  );
}
