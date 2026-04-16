import { parseAuthParams } from "@/lib/auth/return-to";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { app, returnTo } = parseAuthParams(params);

  return (
    <main className="page">
      <div className="card">
        <h1 className="card-title">Forgot password</h1>
        <p className="card-subtitle">
          Enter your email and we&apos;ll send you a reset link.
        </p>
        <ForgotPasswordForm app={app} returnTo={returnTo} />
      </div>
    </main>
  );
}
