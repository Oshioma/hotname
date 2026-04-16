import { parseAuthParams } from "@/lib/auth/return-to";
import { SignInForm } from "./SignInForm";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { app, returnTo } = parseAuthParams(params);

  return (
    <main className="page">
      <div className="card">
        <h1 className="card-title">Sign in</h1>
        <p className="card-subtitle">Welcome back.</p>
        <SignInForm app={app} returnTo={returnTo} />
      </div>
    </main>
  );
}
