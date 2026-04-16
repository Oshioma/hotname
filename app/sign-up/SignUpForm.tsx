"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpWithPassword, type ActionState } from "@/lib/auth/actions";
import { buildAuthQuery } from "@/lib/auth/return-to";

interface SignUpFormProps {
  app: string | null;
  returnTo: string | null;
}

export function SignUpForm({ app, returnTo }: SignUpFormProps) {
  const [state, action, isPending] = useActionState<ActionState | null, FormData>(
    signUpWithPassword,
    null
  );

  const authQuery = buildAuthQuery(app, returnTo);

  if (state?.success) {
    return (
      <div className="alert alert-success" role="status">
        {state.message}
      </div>
    );
  }

  return (
    <form action={action} className="form">
      <input type="hidden" name="app" value={app ?? ""} />
      <input type="hidden" name="returnTo" value={returnTo ?? ""} />

      {state?.error && <p className="alert alert-error">{state.error}</p>}

      <div className="field">
        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className={state?.fieldErrors?.fullName ? "input-error" : ""}
        />
        {state?.fieldErrors?.fullName && (
          <span className="field-error">{state.fieldErrors.fullName[0]}</span>
        )}
      </div>

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
          autoComplete="new-password"
          required
          className={state?.fieldErrors?.password ? "input-error" : ""}
        />
        {state?.fieldErrors?.password && (
          <span className="field-error">{state.fieldErrors.password[0]}</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className={state?.fieldErrors?.confirmPassword ? "input-error" : ""}
        />
        {state?.fieldErrors?.confirmPassword && (
          <span className="field-error">
            {state.fieldErrors.confirmPassword[0]}
          </span>
        )}
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary">
        {isPending ? "Creating account…" : "Create account"}
      </button>

      <p className="form-footer">
        Already have an account?{" "}
        <Link href={`/sign-in${authQuery}`}>Sign in</Link>
      </p>
    </form>
  );
}
