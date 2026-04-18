import { SignInForm } from "./SignInForm";

export default async function SignInPage() {
  return (
    <main className="page">
      <div className="card">
        <h1 className="card-title">Sign in</h1>
        <p className="card-subtitle">Welcome back.</p>
        <SignInForm />
      </div>
    </main>
  );
}
