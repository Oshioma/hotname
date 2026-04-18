import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Middleware:
 * - Refreshes Supabase session on every request.
 * - Protects /dashboard and /send — redirects unauthenticated users to /login.
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const protectedPaths = ['/dashboard', '/send', '/compose', '/contacts', '/settings'];
  const isProtectedPath = protectedPaths.some((p) => pathname.startsWith(p));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const redirectToLogin = () => {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    return isProtectedPath ? redirectToLogin() : NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  let supabase;

  try {
    supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          } catch {
            // Keep middleware non-fatal if cookie writes fail.
          }
        },
      },
    });
  } catch {
    return isProtectedPath ? redirectToLogin() : NextResponse.next({ request });
  }

  try {
    // Refresh the session — do not remove this call.
    const { data, error } = await supabase.auth.getUser();
    const user = data?.user ?? null;
    if (isProtectedPath && (!user || error)) {
      return redirectToLogin();
    }
  } catch {
    if (isProtectedPath) {
      return redirectToLogin();
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
