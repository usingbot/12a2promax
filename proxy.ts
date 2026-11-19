import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function proxy(request: NextRequest) {
  let result = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return result;
  const db = createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (changes) => {
        for (const c of changes) request.cookies.set(c.name, c.value);
        result = NextResponse.next({ request });
        for (const c of changes) result.cookies.set(c.name, c.value, c.options);
      },
    },
  });
  await db.auth.getUser();
  result.headers.set("Cache-Control", "private, no-store");
  return result;
}
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
