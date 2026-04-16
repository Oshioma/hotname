"use client";

import { useActionState } from "react";
import { updatePassword, type ActionState } from "@/lib/auth/actions";

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState<ActionState | null, FormData>(
    updatePassword,
    null
  );

  return (
    <form action={action} className="form">
      {state?.error && <p className="alert alert-error">{state.error}</p>}

      <div className="field">
        <label htmlFor="password">New password</label>
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
        <label htmlFor="confirmPassword">Confirm new password</label>
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
        {isPending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
