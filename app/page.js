import Link from 'next/link';

export default function Home() {
  return (
    <>
      <nav>
        <span className="logo">hot<span>name</span></span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/login"><button className="btn-ghost">Log in</button></Link>
          <Link href="/signup"><button className="btn-primary">Sign up</button></Link>
        </div>
      </nav>

      <main style={{ minHeight: 'calc(100vh - 57px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-1px', marginBottom: '1rem' }}>
          Receive messages<br />from <span style={{ color: '#ff5c3a' }}>anyone</span>
        </h1>
        <p style={{ color: '#888', fontSize: '15px', maxWidth: '380px', marginBottom: '2rem' }}>
          Create your Hotname link. Share it. Let people send you messages — anonymously or not — across any platform.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/signup"><button className="btn-primary">Get started — it&apos;s free</button></Link>
          <Link href="/login"><button className="btn-outline">Sign in</button></Link>
        </div>
      </main>
    </>
  );
}
