import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /sign-out — signs the user out and redirects to /sign-in.
 * Kept as a GET route so a plain link can trigger sign-out.
 */
export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${siteUrl}/sign-in`);
}
