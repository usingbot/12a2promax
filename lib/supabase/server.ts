import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && /^https?:\/\//.test(url) && key ? { url, key } : null;
}
export function configured() {
  return Boolean(config() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
export function canSubmit() {
  return (
    configured() && (process.env.UPLOAD_RATE_LIMIT_SECRET?.length ?? 0) >= 32
  );
}
export function publicDb() {
  const conf = config();
  if (!conf) throw new Error("Chưa kết nối kho ký ức.");
  return createClient(conf.url, conf.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
export function privilegedDb() {
  const conf = config(),
    secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!conf || !secret) throw new Error("Chưa kết nối kho ký ức.");
  return createClient(conf.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function sessionDb() {
  const conf = config();
  if (!conf) throw new Error("Chưa kết nối kho ký ức.");
  const jar = await cookies();
  return createServerClient(conf.url, conf.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          for (const { name, value, options } of values)
            jar.set(name, value, options);
        } catch {
          /* A Server Component may only read cookies. The proxy refreshes sessions. */
        }
      },
    },
  });
}
export async function adminSession() {
  if (!configured()) return null;
  const db = await sessionDb();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) return null;
  const { data } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data ? { db, user } : null;
}
