import type { ReactNode } from "react";
import { Brand } from "../ui/Mark";
import { logout } from "@/app/admin/actions";
import { Images, SlidersHorizontal, LogOut } from "lucide-react";
export default function Shell({
  active,
  children,
}: {
  active: "photos" | "settings";
  children: ReactNode;
}) {
  return (
    <>
      <header className="topbar">
        <div className="header-inner">
          <Brand />
          <form action={logout}>
            <button className="outline">
              <LogOut size={16} />
              Đăng xuất
            </button>
          </form>
        </div>
      </header>
      <main className="admin-main">
        <nav className="admin-nav" aria-label="Trang quản trị">
          <a
            aria-current={active === "photos" ? "page" : undefined}
            href="/admin"
          >
            <Images />
            Quản lý ảnh
          </a>
          <a
            aria-current={active === "settings" ? "page" : undefined}
            href="/admin/settings"
          >
            <SlidersHorizontal />
            Cài đặt website
          </a>
        </nav>
        {children}
      </main>
    </>
  );
}
