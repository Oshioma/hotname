"use client";

import { useActionState } from "react";
import Link from "next/link";
import Script from "next/script";
import { signInWithPassword, type ActionState } from "@/lib/auth/actions";

export function SignInForm() {
  const [state, action, isPending] = useActionState<ActionState | null, FormData>(
    signInWithPassword,
    null
  );

  return (
    <form action={action} className="form">
      {state?.error && <p className="alert alert-error">{state.error}</p>}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={state?.fieldErrors?.email ? "input-error" : ""}
        />
        {state?.fieldErrors?.email && (
          <span className="field-error">{state.fieldErrors.email[0]}</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={state?.fieldErrors?.password ? "input-error" : ""}
        />
        {state?.fieldErrors?.password && (
          <span className="field-error">{state.fieldErrors.password[0]}</span>
        )}
      </div>

      <div className="link-row">
        <Link href="/forgot-password" className="link">
          Forgot password?
        </Link>
      </div>

      <div
        className="cf-turnstile"
        data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
      />

      <button type="submit" disabled={isPending} className="btn btn-primary">
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      <p className="form-footer">
        No account?{" "}
        <Link href="/sign-up">Create one</Link>
      </p>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
    </form>
  );
}
