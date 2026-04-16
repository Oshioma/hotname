import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="page">
      <div className="card">
        <h1 className="card-title">Reset password</h1>
        <p className="card-subtitle">Choose a new password for your account.</p>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
