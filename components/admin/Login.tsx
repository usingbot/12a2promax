"use client";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { login } from "@/app/admin/actions";
export default function Login({ ready }: { ready: boolean }) {
  const [error, action, pending] = useActionState(login, "");
  return (
    <form action={action} className="form-stack">
      <label>
        Email quản trị
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="Email của bạn"
        />
      </label>
      <label>
        Mật khẩu
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={1024}
          required
        />
      </label>
      {!ready && (
        <p className="notice">
          Chưa cấu hình kết nối Supabase. Đăng nhập sẽ mở khi kho ký ức sẵn
          sàng.
        </p>
      )}
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      <button className="primary" disabled={!ready || pending}>
        <KeyRound size={16} />
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
