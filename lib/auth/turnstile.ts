const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * Throws with a user-facing message if the token is missing or invalid.
 */
export async function verifyTurnstile(
  token: string | null | undefined
): Promise<void> {
  if (!token) {
    throw new Error("Human verification is required. Please complete the challenge.");
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error("Turnstile is not configured. Please contact support.");
  }

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  if (!res.ok) {
    throw new Error("Human verification check failed. Please try again.");
  }

  const data = (await res.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };

  if (!data.success) {
    throw new Error("Human verification failed. Please try again.");
  }
}
