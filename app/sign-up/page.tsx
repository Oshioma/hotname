import { parseAuthParams } from "@/lib/auth/return-to";
import { SignUpForm } from "./SignUpForm";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SignUpPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { app, returnTo } = parseAuthParams(params);

  return (
    <main className="page">
      <div className="card">
        <h1 className="card-title">Create account</h1>
        <p className="card-subtitle">Join Hotname.</p>
        <SignUpForm app={app} returnTo={returnTo} />
      </div>
    </main>
  );
}
