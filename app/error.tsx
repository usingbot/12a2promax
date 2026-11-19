"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="loading-page">
      <h1>Trang lưu bút tạm khép lại</h1>
      <p>Kết nối bị gián đoạn. Hãy thử mở lại trang.</p>
      <button className="primary" onClick={reset}>
        Thử lại
      </button>
    </main>
  );
}
