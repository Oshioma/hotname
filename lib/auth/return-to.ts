// lib/auth/return-to.ts

const DEFAULT_FALLBACK = process.env.NEXT_PUBLIC_SITE_URL || "/";

function normalizeOrigin(value: string): string {
  try {
    const url = new URL(value);
    return url.origin.toLowerCase();
  } catch {
    return "";
  }
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    // Remove trailing slash except for root
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return "";
  }
}

function getAllowedReturnToList(): string[] {
  const raw = process.env.AUTH_ALLOWED_RETURN_TO || "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeUrl)
    .filter(Boolean);
}

export function getSafeFallbackUrl(): string {
  const normalized = normalizeUrl(DEFAULT_FALLBACK);
  return normalized || "/";
}

/**
 * Validates a returnTo URL against the allowlist of permitted origins.
 * Only http/https URLs whose origin matches an allowlisted entry are accepted.
 * Returns the URL if valid, or the safe fallback URL.
 *
 * This is the single source of truth for open-redirect prevention.
 */
export function getValidatedReturnTo(
  returnTo: string | null | undefined
): string {
  if (!returnTo) return getSafeFallbackUrl();

  let url: URL;
  try {
    url = new URL(returnTo);
  } catch {
    return getSafeFallbackUrl();
  }

  // Only allow standard web protocols
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return getSafeFallbackUrl();
  }

  const allowed = getAllowedReturnToList();
  const returnToOrigin = normalizeOrigin(returnTo);
  const isAllowed = allowed.some(
    (allowedUrl) => normalizeOrigin(allowedUrl) === returnToOrigin
  );

  return isAllowed ? returnTo : getSafeFallbackUrl();
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
 * Extracts app and returnTo from a URL object or an object with a searchParams
 * property (such as a Next.js page's awaited searchParams).
 * Always returns typed nulls, never undefined.
 */
export function parseAuthContext(
  input:
    | URL
    | {
        searchParams?:
          | URLSearchParams
          | Record<string, string | string[] | undefined>;
      }
): { app: string | null; returnTo: string | null } {
  let sp: URLSearchParams;

  if (input instanceof URL) {
    sp = input.searchParams;
  } else if (input.searchParams instanceof URLSearchParams) {
    sp = input.searchParams;
  } else {
    sp = new URLSearchParams();
    for (const [key, val] of Object.entries(input.searchParams ?? {})) {
      const v = Array.isArray(val) ? val[0] : val;
      if (typeof v === "string") sp.set(key, v);
    }
  }

  return {
    app: sp.get("app"),
    returnTo: sp.get("returnTo"),
  };
}
