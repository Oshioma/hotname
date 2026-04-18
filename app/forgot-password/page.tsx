import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  return (
    <main className="page">
      <div className="card">
        <h1 className="card-title">Forgot password</h1>
        <p className="card-subtitle">
          Enter your email and we&apos;ll send you a reset link.
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
