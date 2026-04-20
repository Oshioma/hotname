import Link from 'next/link';
import Logo from '@/app/components/Logo';
import HomeSearch from '@/app/HomeSearch';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <nav>
        <Link href="/"><Logo /></Link>
        <div className="nav-actions">
          <Link href="/login"><button className="btn-ghost">Log in</button></Link>
          <Link href="/signup"><button className="btn-primary">Claim yours</button></Link>
        </div>
      </nav>

      <section className="hero">
        <h1>
          Your hot<em>name</em>
          <br />is all they need.
        </h1>
        <p className="lede">
          Share one name. Choose how you let people reach you without exposing anything!
        </p>
        <HomeSearch viewerLoggedIn={!!user} />
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
    </>
  );
}
