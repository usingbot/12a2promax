"use server";
import { redirect } from "next/navigation";
import { adminSession, configured, sessionDb } from "@/lib/supabase/server";
export async function login(_message: string, form: FormData) {
  if (!configured()) return "Hệ thống chưa kết nối Supabase.";
  const email = form.get("email"),
    password = form.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 320 ||
    password.length > 1024
  )
    return "Thông tin đăng nhập không hợp lệ.";
  try {
    const db = await sessionDb(),
      { error } = await db.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
    if (error)
      return "Không thể đăng nhập. Hãy kiểm tra tài khoản hoặc thử lại sau.";
    if (!(await adminSession())) {
      await db.auth.signOut({ scope: "local" });
      return "Tài khoản này chưa có quyền quản trị.";
    }
  } catch {
    return "Chưa kết nối được dịch vụ xác thực.";
  }
  redirect("/admin");
}
export async function logout() {
  if (configured()) await (await sessionDb()).auth.signOut({ scope: "local" });
  redirect("/admin/login");
}
