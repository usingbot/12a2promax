import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/vietnamese-600.css";
import "@fontsource/cormorant-garamond/latin-600-italic.css";
import "@fontsource/cormorant-garamond/vietnamese-600-italic.css";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/dancing-script/latin-500.css";
import "@fontsource/dancing-script/vietnamese-500.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "12A2 Pro Max — Lưu bút thanh xuân",
  description: "Những bức ảnh và câu chuyện của lớp 12A2, niên khóa 2026–2027.",
};
export const viewport: Viewport = {
  themeColor: "#382031",
  width: "device-width",
  initialScale: 1,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
