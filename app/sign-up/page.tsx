import { SignUpForm } from "./SignUpForm";

export default async function SignUpPage() {
  return (
    <main className="page">
      <div className="card">
        <h1 className="card-title">Create account</h1>
        <p className="card-subtitle">Join Hotname.</p>
        <SignUpForm />
      </div>
    </main>
  );
}
