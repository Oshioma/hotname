const DEFAULT_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Returns the list of allowed return-to origins from the environment.
 * Each entry is compared at the origin level to prevent path-based bypasses.
 */
function getAllowedOrigins(): string[] {
  const raw = process.env.AUTH_ALLOWED_RETURN_TO ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Validates a returnTo URL against the allowlist of permitted origins.
 * Only http/https URLs whose origin matches an allowlisted entry are accepted.
 * Returns the URL if valid, or DEFAULT_URL as a safe fallback.
 *
 * This is the single source of truth for open-redirect prevention.
 */
export function validateReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo) return DEFAULT_URL;

  let url: URL;
  try {
    url = new URL(returnTo);
  } catch {
    return DEFAULT_URL;
  }

  // Only allow standard web protocols
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return DEFAULT_URL;
  }

  const allowed = getAllowedOrigins();
  const isAllowed = allowed.some((allowedUrl) => {
    try {
      return url.origin === new URL(allowedUrl).origin;
    } catch {
      return false;
    }
  });

  return isAllowed ? returnTo : DEFAULT_URL;
}

/**
 * Builds a query string from optional app and returnTo params.
 * Returns an empty string if neither is provided.
 *
 * Example: buildAuthQuery("guestlist", "https://guestlist.com/auth/callback")
 *   → "?app=guestlist&returnTo=https%3A%2F%2Fguestlist.com%2Fauth%2Fcallback"
 */
export function buildAuthQuery(
  app: string | null | undefined,
  returnTo: string | null | undefined
): string {
  const params = new URLSearchParams();
  if (app) params.set("app", app);
  if (returnTo) params.set("returnTo", returnTo);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Extracts app and returnTo from URLSearchParams or a plain object.
 * Always returns typed nulls, never undefined.
 */
export function parseAuthParams(
  searchParams:
    | URLSearchParams
    | { app?: string | string[]; returnTo?: string | string[] }
): { app: string | null; returnTo: string | null } {
  if (searchParams instanceof URLSearchParams) {
    return {
      app: searchParams.get("app"),
      returnTo: searchParams.get("returnTo"),
    };
  }

  const app = searchParams.app;
  const returnTo = searchParams.returnTo;

  return {
    app: Array.isArray(app) ? app[0] ?? null : (app ?? null),
    returnTo: Array.isArray(returnTo)
      ? returnTo[0] ?? null
      : (returnTo ?? null),
  };
}
