import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Middleware:
 * - Refreshes Supabase session on every request.
 * - Protects /dashboard and /send — redirects unauthenticated users to /login.
 */
export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — do not remove this call.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const protectedPaths = ['/dashboard', '/send'];

  if (protectedPaths.some((p) => pathname.startsWith(p)) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
