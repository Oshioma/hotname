import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <p className="landing-logo">Hotname</p>
      <h1 className="landing-title">Sign in to Hotname</h1>
      <p className="landing-desc">
        Manage your Hotname account. Sign in or create an account to continue.
      </p>
      <div className="landing-actions">
        <Link href="/sign-in">
          <button className="btn btn-primary">Sign in</button>
        </Link>
        <Link href="/sign-up">
          <button className="btn btn-secondary">Create account</button>
        </Link>
      </div>
    </main>
  );
}
