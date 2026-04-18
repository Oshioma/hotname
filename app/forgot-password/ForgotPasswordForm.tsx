"use client";

import { useActionState } from "react";
import Link from "next/link";
import Script from "next/script";
import { sendPasswordReset, type ActionState } from "@/lib/auth/actions";

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState<ActionState | null, FormData>(
    sendPasswordReset,
    null
  );

  if (state?.success) {
    return (
      <div className="alert alert-success" role="status">
        {state.message}
      </div>
    );
  }

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

      <div
        className="cf-turnstile"
        data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
      />

      <button type="submit" disabled={isPending} className="btn btn-primary">
        {isPending ? "Sending…" : "Send reset link"}
      </button>

      <p className="form-footer">
        <Link href="/sign-in">Back to sign in</Link>
      </p>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
    </form>
  );
}
