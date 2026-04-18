"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/auth/turnstile";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type ActionState = {
  error?: string | null;
  fieldErrors?: Partial<Record<string, string[]>>;
  success?: boolean;
  message?: string;
};

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const signUpSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required."),
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Signs in an existing user with email and password.
 * On success, redirects to /security.
 */
export async function signInWithPassword(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    await verifyTurnstile(formData.get("cf-turnstile-response") as string | null);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Verification failed." };
  }

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = signInSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect("/security");
}

/**
 * Registers a new user with email and password.
 * Returns a success state prompting the user to check their email.
 */
export async function signUpWithPassword(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    await verifyTurnstile(formData.get("cf-turnstile-response") as string | null);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Verification failed." };
  }

  const raw = {
    fullName: formData.get("fullName") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const result = signUpSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const { fullName, email, password } = result.data;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = new URL(`${siteUrl}/auth/callback`);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: "Check your email for a confirmation link.",
  };
}

/**
 * Sends a password-reset email.
 * The reset link directs the user back to /auth/callback with type=recovery,
 * which then redirects to /reset-password.
 */
export async function sendPasswordReset(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    await verifyTurnstile(formData.get("cf-turnstile-response") as string | null);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Verification failed." };
  }

  const raw = {
    email: formData.get("email") as string,
  };

  const result = forgotPasswordSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const { email } = result.data;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = new URL(`${siteUrl}/auth/callback`);
  callbackUrl.searchParams.set("type", "recovery");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl.toString(),
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: "If that address is registered, a reset link has been sent.",
  };
}

/**
 * Updates the authenticated user's password.
 * Requires an active recovery session (established via /auth/callback).
 * On success, redirects to /security.
 */
export async function updatePassword(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const result = resetPasswordSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/security");
}

/**
 * Signs the user out and redirects to /sign-in.
 * Signature compatible with React 19 form `action` prop.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
