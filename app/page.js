import Link from 'next/link';
import Logo from '@/app/components/Logo';
import HomeSearch from '@/app/HomeSearch';
import { createServiceClient } from '@/lib/supabase/service';

// The claimed-Hotnames column is fetched on the server and refreshed at most
// once a minute, so the home page stays fast however many visitors it gets.
export const revalidate = 60;

const CLAIMED_LIMIT = 100;

async function getClaimedHotnames() {
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from('profiles')
      .select('username')
      .order('created_at', { ascending: false })
      .limit(CLAIMED_LIMIT);
    if (error) { console.error('[claimed]', error); return []; }
    return (data ?? []).map((p) => p.username).filter(Boolean);
  } catch (e) {
    console.error('[claimed] threw', e);
    return [];
  }
}

export default async function Home() {
  const claimed = await getClaimedHotnames();

  return (
    <>
      <nav className="nav-dark">
        <Link href="/"><Logo /></Link>
        <span className="nav-tagline">One name for everything!</span>
        <div className="nav-actions">
          <Link href="/login"><button className="btn-ghost">Log in</button></Link>
          <Link href="/signup"><button className="btn-primary">Claim yours</button></Link>
        </div>
      </nav>

      <div className={claimed.length ? 'home-layout' : undefined}>
        <main className="home-main">
          <section className="hero">
            <h1>
              Your hot<em>name</em>
              <br />is all they need.
            </h1>
            <HomeSearch />
            <div className="cta">
              <Link href="/signup"><button className="btn-primary">Claim your Hotname</button></Link>
            </div>
          </section>

          <section className="how">
            <div className="how-step">
              <div className="n">01</div>
              <h3>Claim your Hotname</h3>
              <p>Pick one handle — @yourname. That becomes your digital front door.</p>
            </div>
            <div className="how-step">
              <div className="n">02</div>
              <h3>Set your contact rules</h3>
              <p>Choose which channels are open, invite-only, or hidden. Change them anytime.</p>
            </div>
            <div className="how-step">
              <div className="n">03</div>
              <h3>Let people reach you</h3>
              <p>Visitors see what you allow. You approve, deny, or redirect each request.</p>
            </div>
          </section>

          <div className="trust-row">
            <span>Private by default</span>
            <span>·</span>
            <span>No spam. No exposure.</span>
            <span>·</span>
            <span>You control everything</span>
          </div>
        </main>

        {claimed.length > 0 && (
          <aside className="claimed" aria-label="Claimed Hotnames">
            <ul className="claimed-list">
              {claimed.map((username) => (
                <li key={username}>
                  <a
                    href={`/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="claimed-card"
                  >
                    <span className="claimed-at">@</span>{username}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </>
  );
}
