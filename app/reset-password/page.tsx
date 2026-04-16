import { parseAuthContext } from "@/lib/auth/return-to";
import { ResetPasswordForm } from "./ResetPasswordForm";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { app, returnTo } = parseAuthContext({ searchParams: params });

  return (
    <main className="page">
      <div className="card">
        <h1 className="card-title">Reset password</h1>
        <p className="card-subtitle">Choose a new password for your account.</p>
        <ResetPasswordForm app={app} returnTo={returnTo} />
      </div>
    </main>
  );
}
