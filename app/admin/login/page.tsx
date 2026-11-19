import Link from "next/link";
import { redirect } from "next/navigation";
import { adminSession, configured } from "@/lib/supabase/server";
import { Brand } from "@/components/ui/Mark";
import Login from "@/components/admin/Login";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await adminSession()) redirect("/admin");
  return (
    <main className="login-page">
      <section className="login-sheet">
        <Brand />
        <h1 className="admin-title">Đăng nhập quản trị</h1>
        <p>Quản lý ảnh và lưu bút của lớp 12A2.</p>
        <Login ready={configured()} />
        <Link className="back-link" href="/">
          Về miền ký ức
        </Link>
      </section>
    </main>
  );
}
