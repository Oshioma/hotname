import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";

/**
 * Security page — requires an authenticated session.
 *
 * Uses getUser() (server-side token validation) rather than getSession()
 * to reliably detect expired or invalid sessions in SSR.
 */
export default async function SecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="security-page">
      <header className="security-header">
        <div>
          <h1 className="security-title">Security</h1>
          <p className="security-email">{user.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn btn-secondary" style={{ width: "auto" }}>
            Sign out
          </button>
        </form>
      </header>

      <section className="security-section">
        <div className="security-card">
          <h2 className="security-card-title">Password</h2>
          <p className="security-card-desc">
            Change your account password.
          </p>
          <Link href="/reset-password" className="link" style={{ fontSize: "0.875rem" }}>
            Change password →
          </Link>
        </div>
      </section>

      <section className="security-section">
        <div className="security-card">
          <h2 className="security-card-title">Active sessions</h2>
          <p className="security-card-desc">
            Manage devices currently signed in to your account.
          </p>
          <span className="badge">Coming soon</span>
        </div>
      </section>

      <section className="security-section">
        <div className="security-card">
          <h2 className="security-card-title">Two-factor authentication</h2>
          <p className="security-card-desc">
            Add an extra layer of security with MFA or passkeys.
          </p>
          <span className="badge">Coming soon</span>
        </div>
      </section>
    </div>
  );
}
