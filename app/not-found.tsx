import Link from "next/link";
export default function Missing() {
  return (
    <main className="loading-page">
      <h1>Trang lưu bút đang ở đâu nhỉ?</h1>
      <Link className="primary" href="/">
        Về miền ký ức
      </Link>
    </main>
  );
}
